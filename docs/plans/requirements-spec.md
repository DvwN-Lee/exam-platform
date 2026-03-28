# AI Exam Agent — 기술 요구사항 명세서

> **Source**: [BRD v1.3](./2026-03-02-ai-exam-agent-brd.md) + [Sprint Backlog](./sprint-backlog.md)
> **Version**: 1.0
> **Date**: 2026-03-28
> **Scope**: Silver Tier (49 SP) 기준, Gold 확장 사항 별도 표기

---

## A. Data Model 상세 명세

### A.1 MaterialInfo — 교재 자료

> 기존 패턴 참조: `testquestion/models.py:13-56` (TestQuestionInfo)

```python
class MaterialInfo(models.Model):
    subject = models.ForeignKey(
        SubjectInfo,
        on_delete=models.PROTECT,
        related_name="materials",
        verbose_name="소속 과목",
    )
    filename = models.CharField(max_length=255, verbose_name="파일명")
    file = models.FileField(
        upload_to="materials/%Y/%m",
        max_length=500,
        verbose_name="교재 파일",
    )
    chunk_count = models.IntegerField(default=0, verbose_name="청크 수")
    status = models.CharField(
        choices=(
            ("processing", "처리 중"),
            ("ready", "준비 완료"),
            ("error", "오류"),
        ),
        max_length=10,
        default="processing",
        verbose_name="처리 상태",
    )
    uploaded_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_materials",
        verbose_name="업로더",
    )
    is_del = models.BooleanField(default=False, verbose_name="삭제 여부")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="생성 시간")
    edit_time = models.DateTimeField(auto_now=True, verbose_name="수정 시간")

    class Meta:
        verbose_name = "교재 자료"
        verbose_name_plural = verbose_name
        ordering = ["-create_time"]
        indexes = [
            models.Index(fields=["subject", "status"]),
            models.Index(fields=["uploaded_by", "is_del"]),
        ]

    def __str__(self) -> str:
        return self.filename
```

**설계 근거**:
- `on_delete=PROTECT`: 과목 삭제 시 교재 보호 (기존 TestQuestionInfo.subject 패턴)
- `on_delete=SET_NULL` for uploaded_by: 교사 탈퇴 시에도 교재 보존 (기존 TestQuestionInfo.create_user 패턴)
- `is_del` soft delete: 기존 패턴 동일
- `create_time`/`edit_time`: 기존 패턴 동일 (`default=timezone.now` / `auto_now=True`)
- `upload_to="materials/%Y/%m"`: 기존 image 업로드 패턴 참조 (`testquestion/models.py:32`)

### A.2 MaterialChunk — 교재 청크 (pgvector)

```python
from pgvector.django import VectorField

class MaterialChunk(models.Model):
    material = models.ForeignKey(
        MaterialInfo,
        on_delete=models.CASCADE,
        related_name="chunks",
        verbose_name="교재",
    )
    content = models.TextField(verbose_name="청크 내용")
    embedding = VectorField(dimensions=768, verbose_name="임베딩 벡터")
    page_number = models.IntegerField(null=True, blank=True, verbose_name="페이지 번호")
    chunk_index = models.IntegerField(verbose_name="청크 순서")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="메타데이터")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="생성 시간")

    class Meta:
        verbose_name = "교재 청크"
        verbose_name_plural = verbose_name
        ordering = ["material", "chunk_index"]
        indexes = [
            models.Index(fields=["material", "chunk_index"]),
        ]

    def __str__(self) -> str:
        return f"{self.material.filename} - chunk {self.chunk_index}"
```

**설계 근거**:
- `dimensions=768`: sentence-transformers 기본 모델(all-MiniLM-L6-v2) 출력 차원. BRD에서 1536이었으나 무료 모델 기준 768이 적합. production에서 다른 모델 사용 시 migration으로 변경.
- `on_delete=CASCADE`: 교재 삭제 시 청크도 삭제 (기존 OptionInfo.test_question 패턴: `testquestion/models.py:62`)
- pgvector HNSW 인덱스는 migration 파일에서 `HnswIndex`로 별도 생성 (Django ORM Meta.indexes는 VectorField 인덱스 미지원)

**pgvector HNSW 인덱스 (migration에서 생성)**:
```sql
CREATE INDEX materialchunk_embedding_hnsw_idx
ON ai_materialchunk
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### A.3 GenerationRequest — AI 생성 요청

```python
import uuid

class GenerationRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(
        SubjectInfo,
        on_delete=models.PROTECT,
        related_name="generation_requests",
        verbose_name="과목",
    )
    requested_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        related_name="generation_requests",
        verbose_name="요청자",
    )
    question_count = models.IntegerField(verbose_name="요청 문제 수")
    type_distribution = models.JSONField(
        default=dict,
        verbose_name="유형 비율",
        help_text='예: {"xz": 0.6, "pd": 0.3, "tk": 0.1}',
    )
    difficulty_distribution = models.JSONField(
        default=dict,
        verbose_name="난이도 비율",
        help_text='예: {"jd": 0.3, "zd": 0.5, "kn": 0.2}',
    )
    material_ids = models.JSONField(
        default=list,
        verbose_name="참조 교재 ID",
        help_text="[int] 형태",
    )
    status = models.CharField(
        choices=(
            ("generating", "생성 중"),
            ("reviewing", "검토 중"),
            ("completed", "완료"),
            ("failed", "실패"),
        ),
        max_length=10,
        default="generating",
        verbose_name="상태",
    )
    celery_task_id = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Celery Task ID"
    )
    error_message = models.TextField(null=True, blank=True, verbose_name="오류 메시지")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="생성 시간")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="완료 시간")

    class Meta:
        verbose_name = "AI 생성 요청"
        verbose_name_plural = verbose_name
        ordering = ["-create_time"]
        indexes = [
            models.Index(fields=["requested_by", "status"]),
            models.Index(fields=["subject", "status"]),
            models.Index(fields=["-create_time"]),
        ]

    def __str__(self) -> str:
        return f"생성요청 {self.id} ({self.status})"
```

**설계 근거**:
- `UUIDField(primary_key=True)`: API Contract에서 `generation_id: uuid`로 정의. URL에 노출되는 ID이므로 UUID 사용.
- `celery_task_id`: Celery task 추적을 위한 필드. task 상태 조회/취소에 필요.
- `error_message`: 실패 시 원인 저장. 교사에게 표시 가능.

### A.4 GeneratedQuestion — AI 생성 문제 (검토 전)

```python
class GeneratedQuestion(models.Model):
    generation = models.ForeignKey(
        GenerationRequest,
        on_delete=models.CASCADE,
        related_name="questions",
        verbose_name="생성 요청",
    )
    temp_id = models.UUIDField(default=uuid.uuid4, editable=False, verbose_name="임시 ID")
    name = models.CharField(max_length=500, verbose_name="문제 제목")
    content = models.TextField(verbose_name="문제 본문")
    tq_type = models.CharField(
        choices=(("xz", "객관식"), ("pd", "주관식"), ("tk", "빈칸 채우기")),
        max_length=2,
        verbose_name="문제 유형",
    )
    tq_degree = models.CharField(
        choices=(("jd", "쉬움"), ("zd", "보통"), ("kn", "어려움")),
        max_length=2,
        verbose_name="난이도",
    )
    options = models.JSONField(
        default=list,
        blank=True,
        verbose_name="선택지",
        help_text='[{"option": "...", "is_right": true}]',
    )
    answer = models.TextField(null=True, blank=True, verbose_name="정답 (주관식/빈칸)")
    source_chunk = models.ForeignKey(
        MaterialChunk,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_questions",
        verbose_name="참조 청크",
    )
    quality_score = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="품질 점수",
        help_text='{"accuracy": 5, "pedagogical": 4, "difficulty": 4, "clarity": 4, "total": 17}',
    )
    critique_rounds = models.IntegerField(default=0, verbose_name="품질 검사 횟수")
    passed_quality_gate = models.BooleanField(default=False, verbose_name="품질 통과 여부")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="생성 시간")

    class Meta:
        verbose_name = "AI 생성 문제"
        verbose_name_plural = verbose_name
        ordering = ["generation", "create_time"]
        indexes = [
            models.Index(fields=["generation", "passed_quality_gate"]),
            models.Index(fields=["temp_id"]),
        ]

    def __str__(self) -> str:
        return f"[{self.get_tq_type_display()}] {self.name}"
```

**설계 근거**:
- `tq_type`/`tq_degree` choices: 기존 TestQuestionInfo와 동일한 choices 값 사용 (`testquestion/models.py:19-30`). 승인 시 직접 매핑 가능.
- `options` JSONField: 객관식 선택지를 JSON으로 저장. 승인 시 OptionInfo로 변환.
- `temp_id`: API Contract의 `temp_id: uuid`. 프론트엔드에서 개별 문제 식별용.

### A.5 TeacherFeedback — 교사 피드백

```python
class TeacherFeedback(models.Model):
    generated_question = models.ForeignKey(
        GeneratedQuestion,
        on_delete=models.CASCADE,
        related_name="feedbacks",
        verbose_name="생성 문제",
    )
    teacher = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_feedbacks",
        verbose_name="교사",
    )
    action = models.CharField(
        choices=(
            ("approve", "승인"),
            ("reject", "거부"),
            ("edit", "수정 후 승인"),
        ),
        max_length=7,
        verbose_name="액션",
    )
    reject_reason = models.TextField(null=True, blank=True, verbose_name="거부 사유")
    original_content = models.JSONField(
        null=True, blank=True, verbose_name="수정 전 원본"
    )
    edited_content = models.JSONField(
        null=True, blank=True, verbose_name="수정 후 내용"
    )
    saved_question = models.ForeignKey(
        "testquestion.TestQuestionInfo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_feedbacks",
        verbose_name="저장된 문제",
    )
    feedback_embedding = VectorField(
        dimensions=768, null=True, blank=True, verbose_name="피드백 벡터"
    )
    create_time = models.DateTimeField(default=timezone.now, verbose_name="생성 시간")

    class Meta:
        verbose_name = "교사 피드백"
        verbose_name_plural = verbose_name
        ordering = ["-create_time"]
        indexes = [
            models.Index(fields=["teacher", "action"]),
            models.Index(fields=["generated_question"]),
            models.Index(fields=["-create_time"]),
        ]

    def __str__(self) -> str:
        return f"{self.teacher} - {self.get_action_display()}"
```

**설계 근거**:
- `saved_question` FK to TestQuestionInfo: 승인/수정 시 기존 문제 DB에 저장된 레코드 참조. BRD의 "GeneratedQuestion → approve → TestQuestionInfo" 흐름 구현.
- `feedback_embedding`: Gold tier (US-3.5 Full)에서 유사 피드백 검색에 사용. Silver에서는 nullable.
- `original_content`/`edited_content`: Gold tier (US-3.3)에서 diff 표시에 사용. Silver에서도 저장은 하되 UI 미표시.

### A.6 모델 관계 다이어그램

```
기존 모델 (변경 0건)                     신규 모델 (apps/ai/)
─────────────────────                   ─────────────────────
SubjectInfo ◄─── FK(PROTECT) ─── MaterialInfo
                                         │
UserProfile ◄─── FK(SET_NULL) ──┘        │ FK(CASCADE)
                                         ▼
SubjectInfo ◄─── FK(PROTECT) ─── GenerationRequest (UUID PK)
                                         │
UserProfile ◄─── FK(SET_NULL) ──┘        │ FK(CASCADE)
                                         ▼
MaterialChunk ◄── FK(SET_NULL) ── GeneratedQuestion
                                         │
                                         │ FK(CASCADE)
                                         ▼
UserProfile ◄─── FK(SET_NULL) ─── TeacherFeedback
                                         │
TestQuestionInfo ◄── FK(SET_NULL) ──┘    (승인 시에만)
```

---

## B. API 상세 명세

### B.0 공통 규칙

> 기존 패턴 참조: `config/api.py:8-44` (DRF 설정), `core/api/pagination.py:9-29`, `core/api/exceptions.py:9-24`

- **인증**: `JWTAuthentication` (기존 설정 그대로)
- **Pagination**: `StandardResultsSetPagination` (page_size=20, max=100)
- **에러 응답**: `custom_exception_handler` (4xx 기존 구조, 5xx 메시지 은닉)
- **Throttle**: 기존 user=120/min. AI 생성 전용 throttle 추가.
- **API 버전**: `/api/v1/ai/` prefix (기존 `DEFAULT_VERSION="v1"` 패턴)

### B.1 MaterialViewSet — 교재 관리

> 기존 패턴 참조: `testquestion/api/views.py:42-193` (QuestionViewSet)

```python
@extend_schema_view(
    list=extend_schema(tags=["ai-materials"], summary="교재 목록 조회"),
    retrieve=extend_schema(tags=["ai-materials"], summary="교재 상세 조회"),
    destroy=extend_schema(tags=["ai-materials"], summary="교재 삭제 (Soft Delete)"),
)
class MaterialViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    filterset_class = MaterialFilter
    search_fields = ["filename"]
    ordering_fields = ["create_time", "chunk_count"]
    ordering = ["-create_time"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return MaterialInfo.objects.none()
        return (
            MaterialInfo.objects.filter(
                uploaded_by=self.request.user, is_del=False
            )
            .select_related("subject", "uploaded_by")
        )

    def get_permissions(self):
        return [IsAuthenticated(), IsTeacher()]

    def get_serializer_class(self):
        if self.action == "list":
            return MaterialListSerializer
        if self.action == "retrieve":
            return MaterialDetailSerializer
        return MaterialListSerializer

    def perform_destroy(self, instance):
        """Soft Delete (기존 패턴: testquestion/api/views.py:108-112)"""
        instance.is_del = True
        instance.save()
```

**업로드 전용 APIView** (multipart/form-data):

```python
@extend_schema(
    tags=["ai-materials"],
    summary="교재 PDF 업로드",
    request=MaterialUploadSerializer,
    responses={201: MaterialListSerializer},
)
class MaterialUploadView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    parser_classes = [MultiPartParser]

    def post(self, request):
        serializer = MaterialUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        material = serializer.save(uploaded_by=request.user)
        # Celery task로 비동기 벡터화
        process_material_task.delay(material.id)
        return Response(
            MaterialListSerializer(material).data,
            status=status.HTTP_201_CREATED,
        )
```

### B.2 GenerateView — 문제 생성

> 기존 패턴 참조: BRD Section 8.0 제약 #1 (Celery worker 필수)

```python
@extend_schema(
    tags=["ai-generate"],
    summary="AI 문제 생성 요청 (비동기)",
    request=GenerationRequestCreateSerializer,
    responses={202: GenerationRequestStatusSerializer},
)
class GenerateView(APIView):
    """
    POST: 생성 요청 → Celery task 시작 → generation_id 반환 (202)
    """
    permission_classes = [IsAuthenticated, IsTeacher]
    throttle_classes = [AIGenerateThrottle]

    def post(self, request):
        serializer = GenerationRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        generation = serializer.save(requested_by=request.user)
        # Celery task 시작
        task = run_generation_pipeline.delay(str(generation.id))
        generation.celery_task_id = task.id
        generation.save(update_fields=["celery_task_id"])
        return Response(
            GenerationRequestStatusSerializer(generation).data,
            status=status.HTTP_202_ACCEPTED,
        )


@extend_schema(
    tags=["ai-generate"],
    summary="생성 상태/결과 조회 (polling)",
    responses={200: GenerationRequestDetailSerializer},
)
class GenerateDetailView(APIView):
    """
    GET: generation_id로 상태/결과 조회
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, generation_id):
        generation = get_object_or_404(
            GenerationRequest.objects.prefetch_related(
                Prefetch(
                    "questions",
                    queryset=GeneratedQuestion.objects.select_related("source_chunk"),
                )
            ),
            id=generation_id,
            requested_by=request.user,
        )
        return Response(
            GenerationRequestDetailSerializer(generation).data,
        )
```

### B.3 FeedbackView — 교사 피드백

```python
@extend_schema(
    tags=["ai-feedback"],
    summary="교사 피드백 제출 (승인/거부/수정)",
    request=FeedbackCreateSerializer,
    responses={201: FeedbackResponseSerializer},
)
class FeedbackView(APIView):
    """
    POST: 개별 문제에 대한 피드백 (approve/reject/edit)
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        serializer = FeedbackCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save(teacher=request.user)
        return Response(
            FeedbackResponseSerializer(feedback).data,
            status=status.HTTP_201_CREATED,
        )

# FeedbackService.approve() — 동시 approve 방지
#
# select_for_update + 중복 체크로 동일 문제에 대한 동시 승인 방지:
#
# ```python
# def approve(self, generated_question, teacher):
#     with transaction.atomic():
#         gq = GeneratedQuestion.objects.select_for_update().get(
#             id=generated_question.id
#         )
#         if TeacherFeedback.objects.filter(
#             generated_question=gq, action="approve"
#         ).exists():
#             raise ValidationError("이미 승인된 문제입니다.")
#
#         tq = TestQuestionInfo.objects.create(...)
#         if gq.tq_type == "xz":
#             OptionInfo.objects.bulk_create([...])
#         TeacherFeedback.objects.create(
#             generated_question=gq, teacher=teacher,
#             action="approve", saved_question=tq,
#         )
#         return tq
# ```


@extend_schema(
    tags=["ai-feedback"],
    summary="피드백 통계 조회",
    responses={200: FeedbackStatsSerializer},
)
class FeedbackStatsView(APIView):
    """
    GET: 교사별 승인율/거부율/수정율 통계
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        stats = FeedbackService.get_stats(teacher=request.user)
        return Response(FeedbackStatsSerializer(stats).data)
```

### B.4 Serializer 명세

> 기존 패턴 참조: `testquestion/api/serializers.py:15-258` (Read/Write 분리, nested)

#### Material Serializers

```python
class MaterialListSerializer(serializers.ModelSerializer):
    """교재 목록 조회용 경량 Serializer"""
    subject = SubjectSerializer(read_only=True)
    created_at = serializers.DateTimeField(source="create_time", read_only=True)

    class Meta:
        model = MaterialInfo
        fields = ["id", "filename", "subject", "chunk_count", "status", "created_at"]
        read_only_fields = ["id", "chunk_count", "status", "created_at"]


class MaterialDetailSerializer(serializers.ModelSerializer):
    """교재 상세 — 청크 정보 포함"""
    subject = SubjectSerializer(read_only=True)
    chunks = MaterialChunkSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(source="create_time", read_only=True)

    class Meta:
        model = MaterialInfo
        fields = ["id", "filename", "subject", "chunk_count", "chunks", "status", "created_at"]


class MaterialUploadSerializer(serializers.Serializer):
    """교재 업로드 전용"""
    file = serializers.FileField()
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=SubjectInfo.objects.all(), source="subject"
    )
    # validate에서 PDF 확장자/MIME 검사
```

#### Generation Serializers

```python
class GenerationRequestCreateSerializer(serializers.ModelSerializer):
    """생성 요청 입력"""
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=SubjectInfo.objects.all(), source="subject"
    )

    class Meta:
        model = GenerationRequest
        fields = ["subject_id", "material_ids", "question_count",
                  "type_distribution", "difficulty_distribution"]

    def validate_question_count(self, value):
        if not (1 <= value <= 20):
            raise serializers.ValidationError("1~20개 범위로 입력하세요.")
        return value

    def validate_type_distribution(self, value):
        if abs(sum(value.values()) - 1.0) > 0.01:
            raise serializers.ValidationError("유형 비율의 합은 1.0이어야 합니다.")
        valid_types = {"xz", "pd", "tk"}
        if not set(value.keys()).issubset(valid_types):
            raise serializers.ValidationError("유효한 유형: xz, pd, tk")
        return value

    def validate_difficulty_distribution(self, value):
        if abs(sum(value.values()) - 1.0) > 0.01:
            raise serializers.ValidationError("난이도 비율의 합은 1.0이어야 합니다.")
        valid_degrees = {"jd", "zd", "kn"}
        if not set(value.keys()).issubset(valid_degrees):
            raise serializers.ValidationError("유효한 난이도: jd, zd, kn")
        return value

    def validate_material_ids(self, value):
        if not value:
            raise serializers.ValidationError("최소 1개의 교재를 선택하세요.")
        materials = MaterialInfo.objects.filter(
            id__in=value,
            uploaded_by=self.context["request"].user,
            status="ready",
            is_del=False,
        )
        if materials.count() != len(value):
            raise serializers.ValidationError(
                "유효하지 않은 교재가 포함되어 있습니다. "
                "본인이 업로드한 처리 완료(ready) 상태의 교재만 선택 가능합니다."
            )
        return value


class GenerationRequestStatusSerializer(serializers.ModelSerializer):
    """생성 요청 상태 (POST 응답)"""
    generation_id = serializers.UUIDField(source="id")

    class Meta:
        model = GenerationRequest
        fields = ["generation_id", "status"]


class GeneratedQuestionSerializer(serializers.ModelSerializer):
    """생성된 문제 (결과 조회)"""
    source_reference = serializers.SerializerMethodField()
    quality_score = serializers.JSONField()

    class Meta:
        model = GeneratedQuestion
        fields = [
            "temp_id", "name", "content", "tq_type", "tq_degree",
            "options", "answer", "source_reference",
            "quality_score", "critique_rounds", "passed_quality_gate",
        ]

    def get_source_reference(self, obj):
        if not obj.source_chunk:
            return None
        return {
            "material_id": obj.source_chunk.material_id,
            "chunk_text": obj.source_chunk.content[:200],
            "page_number": obj.source_chunk.page_number,
        }


class GenerationRequestDetailSerializer(serializers.ModelSerializer):
    """생성 요청 상세 (polling 결과)"""
    questions = GeneratedQuestionSerializer(many=True, read_only=True)
    stats = serializers.SerializerMethodField()

    class Meta:
        model = GenerationRequest
        fields = ["id", "status", "questions", "stats", "create_time", "completed_at"]

    def get_stats(self, obj):
        questions = obj.questions.all()
        total = questions.count()
        passed = questions.filter(passed_quality_gate=True).count()
        return {
            "total_generated": total,
            "passed": passed,
            "failed": total - passed,
            "avg_quality_score": (
                sum(q.quality_score.get("total", 0) for q in questions) / total
                if total > 0 else 0
            ),
        }
```

#### Feedback Serializers

```python
class FeedbackCreateSerializer(serializers.Serializer):
    """피드백 입력"""
    generation_id = serializers.UUIDField()
    temp_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=["approve", "reject", "edit"])
    reject_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    edited_content = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        # 소유권 검증: generation_id가 요청 교사의 것인지 확인
        try:
            generation = GenerationRequest.objects.get(
                id=attrs["generation_id"],
                requested_by=self.context["request"].user,
            )
        except GenerationRequest.DoesNotExist:
            raise serializers.ValidationError(
                {"generation_id": "해당 생성 요청에 대한 권한이 없습니다."}
            )

        # temp_id로 GeneratedQuestion 존재 확인
        try:
            generated_question = GeneratedQuestion.objects.get(
                generation=generation,
                temp_id=attrs["temp_id"],
            )
        except GeneratedQuestion.DoesNotExist:
            raise serializers.ValidationError(
                {"temp_id": "해당 문제를 찾을 수 없습니다."}
            )

        attrs["_generation"] = generation
        attrs["_generated_question"] = generated_question

        if attrs["action"] == "reject" and not attrs.get("reject_reason"):
            raise serializers.ValidationError(
                {"reject_reason": "거부 시 사유를 입력하세요."}
            )
        if attrs["action"] == "edit" and not attrs.get("edited_content"):
            raise serializers.ValidationError(
                {"edited_content": "수정 시 수정 내용을 입력하세요."}
            )
        return attrs


class FeedbackResponseSerializer(serializers.Serializer):
    """피드백 응답"""
    feedback_id = serializers.IntegerField(source="id")
    question_id = serializers.IntegerField(source="saved_question_id", allow_null=True)
    status = serializers.CharField(default="saved")


class FeedbackTrendSerializer(serializers.Serializer):
    """피드백 통계 트렌드 항목"""
    date = serializers.DateField()
    approval_rate = serializers.FloatField()
    count = serializers.IntegerField()


class FeedbackStatsSerializer(serializers.Serializer):
    """피드백 통계 — FeedbackStatsView 응답"""
    total_generated = serializers.IntegerField()
    approved = serializers.IntegerField()
    rejected = serializers.IntegerField()
    edited = serializers.IntegerField()
    approval_rate = serializers.FloatField()
    trend = FeedbackTrendSerializer(many=True)
```

### B.5 FilterSet 명세

> 기존 패턴 참조: `testquestion/api/filters.py:9-58` (QuestionFilter)

```python
class MaterialFilter(django_filters.FilterSet):
    subject = django_filters.NumberFilter(field_name="subject_id")
    status = django_filters.ChoiceFilter(
        choices=MaterialInfo._meta.get_field("status").choices
    )
    created_after = django_filters.DateTimeFilter(
        field_name="create_time", lookup_expr="gte"
    )
    created_before = django_filters.DateTimeFilter(
        field_name="create_time", lookup_expr="lte"
    )

    class Meta:
        model = MaterialInfo
        fields = ["subject", "status", "created_after", "created_before"]
```

### B.6 URL 라우팅

> 기존 패턴 참조: `testquestion/api/urls.py:1-14` (DefaultRouter)

```python
# apps/ai/api/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"materials", MaterialViewSet, basename="material")

urlpatterns = [
    path("", include(router.urls)),
    path("generate/", GenerateView.as_view(), name="ai-generate"),
    path("generate/<uuid:generation_id>/", GenerateDetailView.as_view(), name="ai-generate-detail"),
    path("feedback/", FeedbackView.as_view(), name="ai-feedback"),
    path("feedback/stats/", FeedbackStatsView.as_view(), name="ai-feedback-stats"),
]

# examonline/urls.py에 추가
# path("api/v1/ai/", include("ai.api.urls")),
```

### B.7 Throttle 설정

```python
# apps/ai/api/throttles.py
from rest_framework.throttling import UserRateThrottle

class AIGenerateThrottle(UserRateThrottle):
    """AI 문제 생성 요청 제한 — Gemini free tier 500 RPD 보호"""
    rate = "30/hour"
```

`config/api.py` REST_FRAMEWORK에 추가:
```python
"DEFAULT_THROTTLE_RATES": {
    "anon": "30/minute",
    "user": "120/minute",
    "auth": "10/minute",
    "ai_generate": "30/hour",  # 신규
}
```

### B.8 Permission 명세

> 기존 패턴 참조: `core/api/permissions.py:8-99`

AI API는 모두 교사 전용이므로 기존 `IsTeacher` 재사용:
- `MaterialViewSet`: `[IsAuthenticated, IsTeacher]`
- `GenerateView`: `[IsAuthenticated, IsTeacher]`
- `FeedbackView`: `[IsAuthenticated, IsTeacher]`
- `FeedbackStatsView`: `[IsAuthenticated, IsTeacher]`

추가 Permission 불필요 — 기존 `IsTeacher` (`core/api/permissions.py:8-18`)로 충분.

---

## C. LangGraph 파이프라인 명세

### C.1 StateGraph 정의

```python
from typing import TypedDict
from langgraph.graph import StateGraph, END

class PipelineState(TypedDict):
    # 입력
    subject_id: int
    material_ids: list[int]
    question_count: int
    type_distribution: dict[str, float]
    difficulty_distribution: dict[str, float]
    generation_id: str
    # RAG
    context_chunks: list[dict]  # [{content, page_number, chunk_id}]
    # 생성
    generated_questions: list[dict]
    # 평가
    quality_scores: list[dict]  # [{accuracy, pedagogical, difficulty, clarity, total}]
    passed_questions: list[dict]
    failed_questions: list[dict]
    # 메타
    current_round: int  # 0, 1, 2, 3
    max_rounds: int     # 3
    # 피드백 (US-3.5 Lite)
    recent_feedback: list[dict]  # 최근 거부 사유

# 그래프 구성
graph = StateGraph(PipelineState)

graph.add_node("retrieve_context", retrieve_context_node)
graph.add_node("generate_questions", generate_questions_node)
graph.add_node("critique_questions", critique_questions_node)
graph.add_node("refine_questions", refine_questions_node)
graph.add_node("save_results", save_results_node)

graph.set_entry_point("retrieve_context")
graph.add_edge("retrieve_context", "generate_questions")
graph.add_edge("generate_questions", "critique_questions")
graph.add_conditional_edges(
    "critique_questions",
    quality_gate_router,
    {
        "all_passed": "save_results",
        "needs_refinement": "refine_questions",
        "max_rounds_reached": "save_results",
    },
)
graph.add_edge("refine_questions", "critique_questions")
graph.add_edge("save_results", END)

pipeline = graph.compile()
```

### C.2 노드별 상세

#### retrieve_context_node

```
입력: material_ids, subject_id
출력: context_chunks (list[dict])

로직:
1. MaterialChunk에서 material_id IN material_ids인 청크 조회
2. 과목 키워드로 pgvector cosine similarity 검색 (top-k=10)
3. 검색 결과를 context_chunks에 저장
```

#### generate_questions_node

```
입력: context_chunks, question_count, type_distribution, difficulty_distribution, recent_feedback
출력: generated_questions (list[dict])

로직:
1. type_distribution + difficulty_distribution으로 각 유형/난이도별 문제 수 계산
2. 배치 프롬프트 구성 (N개 문제 1회 LLM 호출)
3. recent_feedback가 있으면 프롬프트에 few-shot 네거티브 예시 삽입 (US-3.5 Lite)
4. LLM 호출 → JSON 파싱 → generated_questions에 저장
```

**Generator 프롬프트 템플릿**:

```
You are an expert exam question generator for the subject "{subject_name}".

## Reference Material
{context_chunks_text}

## Requirements
Generate exactly {question_count} questions with the following distribution:
- Types: {type_distribution_text}
- Difficulty: {difficulty_distribution_text}

## Question Types
- xz (객관식): Multiple choice with 4 options, exactly one correct answer
- pd (주관식): Short answer with a definitive correct answer
- tk (빈칸 채우기): Fill-in-the-blank with a specific correct answer

{feedback_section}

## Output Format (JSON)
[
  {
    "name": "문제 제목",
    "content": "문제 본문",
    "tq_type": "xz|pd|tk",
    "tq_degree": "jd|zd|kn",
    "options": [{"option": "...", "is_right": true/false}],  // xz only
    "answer": "정답"  // pd, tk only
  }
]
```

`{feedback_section}` (US-3.5 Lite, recent_feedback 존재 시):
```
## Previous Feedback (avoid these patterns)
{recent_reject_reasons}
```

#### critique_questions_node

```
입력: generated_questions (또는 refined_questions)
출력: quality_scores, passed_questions, failed_questions

로직:
1. 배치 프롬프트로 N개 문제 1회 평가 (Gemini RPM 절약)
2. 4개 기준 각 1-5점 스코어링
3. Quality Gate 적용: accuracy=5(필수) AND total>=14
4. passed/failed 분류
```

**Critic 프롬프트 템플릿**:

```
You are a strict exam quality reviewer. Evaluate each question on these criteria (1-5 scale):

1. **accuracy** (정답 정확성): Is the correct answer definitively correct? (MUST be 5/5 to pass)
2. **pedagogical** (교육학적 타당성): Does it test meaningful understanding, not trivia?
3. **difficulty** (난이도 적절성): Does the stated difficulty match actual difficulty?
4. **clarity** (문장 품질): Is the question clear, unambiguous, grammatically correct?

## Quality Gate
- accuracy MUST be 5/5 (incorrect answer = automatic fail)
- pedagogical >= 3/5
- difficulty >= 3/5
- clarity >= 3/5
- total >= 14/20

## Questions to Evaluate
{questions_json}

## Output Format (JSON)
[
  {
    "question_index": 0,
    "accuracy": 5,
    "pedagogical": 4,
    "difficulty": 4,
    "clarity": 4,
    "total": 17,
    "passed": true,
    "feedback": "평가 코멘트"
  }
]
```

#### quality_gate_router (조건부 라우팅)

```python
def quality_gate_router(state: PipelineState) -> str:
    if len(state["failed_questions"]) == 0:
        return "all_passed"
    if state["current_round"] >= state["max_rounds"]:
        return "max_rounds_reached"
    return "needs_refinement"
```

#### refine_questions_node

```
입력: failed_questions, quality_scores (failed 문제의 피드백)
출력: generated_questions (재생성된 문제로 교체)

로직:
1. failed 문제 + Critic 피드백을 Refiner 프롬프트에 포함
2. 배치 프롬프트로 failed 문제만 재생성 (1회 LLM 호출)
3. current_round += 1
4. generated_questions에 재생성 결과 병합
```

**Refiner 프롬프트 템플릿**:

```
You are an exam question refiner. Improve the following questions based on critic feedback.

## Original Questions with Feedback
{failed_questions_with_feedback}

## Reference Material
{context_chunks_text}

## Instructions
- Fix accuracy issues (CRITICAL: correct answer must be definitively correct)
- Improve pedagogical value based on feedback
- Adjust difficulty if mismatched
- Improve clarity and grammar

## Output Format (JSON)
[same format as generator output]
```

#### save_results_node

```
입력: passed_questions, failed_questions (max rounds 도달 시), generation_id
출력: (DB 저장, side effect)

로직:
0. Idempotent 체크 (acks_late 중복 실행 방지):
   if GeneratedQuestion.objects.filter(generation_id=generation_id).exists():
       logger.warning("이미 저장된 결과, skip (idempotent)")
       return state

1. transaction.atomic() 블록 내에서 실행:
   with transaction.atomic():
       a. passed_questions → GeneratedQuestion.objects.bulk_create(
              [GeneratedQuestion(..., passed_quality_gate=True) for q in passed]
          )
       b. failed_questions (max rounds 도달) → GeneratedQuestion.objects.bulk_create(
              [GeneratedQuestion(..., passed_quality_gate=False) for q in failed]
          )
       c. GenerationRequest.objects.filter(id=generation_id).update(
              status="completed", completed_at=timezone.now()
          )
```

**설계 근거**:
- `transaction.atomic()`: questions와 status 업데이트의 원자성 보장. 중간 실패 시 전체 롤백.
- Idempotent 체크: Celery `acks_late=True`에서 worker 재시작 시 task가 재실행될 수 있음. 이미 결과가 저장된 경우 중복 생성 방지.

### C.3 Celery Task 정의

```python
# apps/ai/tasks.py
from celery import shared_task

@shared_task(
    name="ai.run_generation_pipeline",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    soft_time_limit=180,  # 3분
    time_limit=210,       # 3.5분 (hard limit)
    acks_late=True,
)
def run_generation_pipeline(self, generation_id: str):
    """
    LangGraph 파이프라인 실행.
    Django request cycle 밖에서 Celery worker가 실행.

    에러 핸들링 전략:
    - SoftTimeLimitExceeded: partial save 시도 후 status="completed" (부분 결과) 또는 "failed"
    - 일반 Exception: status 변경 없이 retry. max_retries 소진 시에만 status="failed"
    - retry 전에 status="failed" 설정 금지 (race condition 방지)
    """
    from ai.services.pipeline import run_pipeline  # lazy import (BRD 제약 #2)
    from celery.exceptions import SoftTimeLimitExceeded

    try:
        run_pipeline(generation_id)
    except SoftTimeLimitExceeded:
        # Timeout: partial save 시도
        # 파이프라인 state에 passed_questions가 있으면 부분 저장
        from ai.services.pipeline import try_partial_save
        partial_saved = try_partial_save(generation_id)
        if partial_saved:
            GenerationRequest.objects.filter(id=generation_id).update(
                status="completed",
                completed_at=timezone.now(),
                error_message="Timeout: partial results saved",
            )
        else:
            GenerationRequest.objects.filter(id=generation_id).update(
                status="failed",
                error_message="파이프라인 실행 시간 초과 (3분)",
            )
        # SoftTimeLimitExceeded는 retry하지 않음 (시간 초과는 재시도해도 동일할 가능성 높음)
    except Exception as exc:
        # retry 가능 여부 확인 (max_retries 소진 전이면 retry)
        if self.request.retries < self.max_retries:
            # status 변경 없이 retry — race condition 방지
            raise self.retry(exc=exc)
        else:
            # max_retries 소진: 최종 실패 처리
            GenerationRequest.objects.filter(id=generation_id).update(
                status="failed",
                error_message=f"최대 재시도 횟수 초과: {str(exc)}",
            )


@shared_task(
    name="ai.process_material",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
    soft_time_limit=120,  # 2분 (50페이지 PDF 기준)
    time_limit=150,
)
def process_material_task(self, material_id: int):
    """
    교재 PDF → 청킹 → 임베딩 → pgvector 저장.
    """
    from ai.services.rag import process_material  # lazy import
    try:
        process_material(material_id)
    except Exception as exc:
        MaterialInfo.objects.filter(id=material_id).update(
            status="error"
        )
        raise self.retry(exc=exc)


# Startup health check — stale "generating" 상태 복구
#
# Celery worker 시작 시 또는 주기적 beat task로 실행:
# "generating" 상태가 10분 이상 지속된 GenerationRequest를 "failed"로 전환.
# worker 크래시/재시작 시 orphaned task 정리 목적.
#
# @shared_task(name="ai.cleanup_stale_generations")
# def cleanup_stale_generations():
#     cutoff = timezone.now() - timedelta(minutes=10)
#     stale = GenerationRequest.objects.filter(
#         status="generating", create_time__lt=cutoff
#     )
#     count = stale.update(
#         status="failed",
#         error_message="Worker 재시작으로 인한 자동 실패 처리",
#     )
#     if count:
#         logger.warning(f"Stale generation requests cleaned up: {count}")
```

### C.4 Celery 설정

```python
# examonline/celery_app.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.local")

app = Celery("examonline")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

```python
# config/base.py에 추가
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Seoul"
CELERY_TASK_TRACK_STARTED = True
```

---

## D. LLM Provider 어댑터 명세

### D.1 어댑터 인터페이스

```python
# apps/ai/llm/base.py
from typing import Protocol

class LLMResponse:
    """LLM 응답 공통 구조"""
    content: str
    input_tokens: int
    output_tokens: int
    model: str
    duration_seconds: float

class LLMProvider(Protocol):
    """LLM Provider 인터페이스 (PEP 544 Protocol)"""

    def generate(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        """동기 텍스트 생성"""
        ...

    def generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        """JSON 모드 생성 (파싱 포함)"""
        ...

    @property
    def model_name(self) -> str:
        ...
```

### D.2 Ollama 구현체

```python
# apps/ai/llm/ollama.py
import httpx

class OllamaProvider:
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2",
        timeout: int = 120,
    ):
        self.base_url = base_url
        self.model = model
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)

    def generate(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        response = self.client.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.model,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        data = response.json()
        return LLMResponse(
            content=data["response"],
            input_tokens=data.get("prompt_eval_count", 0),
            output_tokens=data.get("eval_count", 0),
            model=self.model,
            duration_seconds=data.get("total_duration", 0) / 1e9,
        )

    def generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        response = self.generate(
            prompt=prompt + "\n\nRespond ONLY with valid JSON.",
            system_prompt=system_prompt,
        )
        return json.loads(response.content)

    @property
    def model_name(self) -> str:
        return f"ollama/{self.model}"
```

### D.3 Gemini 구현체

```python
# apps/ai/llm/gemini.py
import google.generativeai as genai

class GeminiProvider:
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",
        timeout: int = 120,
        redis_client=None,
    ):
        genai.configure(api_key=api_key)
        self.model_name_str = model
        self.model = genai.GenerativeModel(model)
        self.timeout = timeout
        self._rate_limiter = RedisRateLimiter(redis_client=redis_client, max_rpm=10)

    def generate(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        self._rate_limiter.acquire()  # Redis 기반 분산 RPM 제한 대기

        generation_config = genai.GenerationConfig(
            temperature=0.7,
            max_output_tokens=8192,
        )

        response = self.model.generate_content(
            contents=prompt,
            generation_config=generation_config,
            system_instruction=system_prompt if system_prompt else None,
        )

        usage = response.usage_metadata
        return LLMResponse(
            content=response.text,
            input_tokens=usage.prompt_token_count,
            output_tokens=usage.candidates_token_count,
            model=self.model_name_str,
            duration_seconds=0,  # Gemini API는 duration 미제공
        )

    def generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        generation_config = genai.GenerationConfig(
            temperature=0.7,
            max_output_tokens=8192,
            response_mime_type="application/json",
        )
        self._rate_limiter.acquire()
        response = self.model.generate_content(
            contents=prompt,
            generation_config=generation_config,
            system_instruction=system_prompt if system_prompt else None,
        )
        return json.loads(response.text)

    @property
    def model_name(self) -> str:
        return f"gemini/{self.model_name_str}"
```

### D.4 Rate Limiter + Exponential Backoff

```python
# apps/ai/llm/rate_limiter.py
import time
import django.core.cache


class RedisRateLimiter:
    """Redis 기반 분산 Rate Limiter (Celery prefork worker 간 공유)

    기존 threading.Lock 기반 RateLimiter는 prefork worker 모델에서
    프로세스 간 상태를 공유하지 못함 → Redis INCR + TTL로 교체.
    """
    def __init__(self, redis_client=None, max_rpm: int = 10):
        self.redis = redis_client or django.core.cache.caches["default"].client.get_client()
        self.max_rpm = max_rpm

    def acquire(self):
        """분산 RPM 카운터 기반 rate limiting.

        Redis key: gemini:rpm:{현재 분} — 1분 TTL 자동 만료.
        카운터가 max_rpm 초과 시 현재 분이 끝날 때까지 대기 후 재시도.
        """
        key = f"gemini:rpm:{int(time.time()) // 60}"
        count = self.redis.incr(key)
        if count == 1:
            self.redis.expire(key, 60)
        if count > self.max_rpm:
            wait = 60 - (time.time() % 60)
            time.sleep(wait)
            return self.acquire()


def with_retry(func, max_retries: int = 3, base_delay: float = 2.0):
    """Exponential backoff wrapper"""
    for attempt in range(max_retries + 1):
        try:
            return func()
        except Exception as exc:
            if attempt == max_retries:
                raise
            delay = base_delay * (2 ** attempt)  # 2, 4, 8초
            time.sleep(delay)
```

### D.5 Provider Factory

```python
# apps/ai/llm/factory.py
from django.conf import settings

def get_llm_provider() -> LLMProvider:
    """환경 변수 기반 LLM Provider 생성"""
    provider = getattr(settings, "LLM_PROVIDER", "ollama")

    if provider == "gemini":
        from ai.llm.gemini import GeminiProvider  # lazy import
        return GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model=getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash"),
            redis_client=None,  # None → RedisRateLimiter가 Django cache backend에서 자동 획득
        )
    else:
        from ai.llm.ollama import OllamaProvider  # lazy import
        return OllamaProvider(
            base_url=getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434"),
            model=getattr(settings, "OLLAMA_MODEL", "llama3.2"),
        )
```

---

## E. Observability 명세

### E.1 Prometheus 14개 메트릭 상세

> 기존 패턴 참조: BRD Section 8.5 (llm-serving-observability 패턴)

```python
# apps/ai/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# === 기존 이식 메트릭 (10개) ===

# M1: E2E 지연시간
llm_request_duration_seconds = Histogram(
    "llm_request_duration_seconds",
    "LLM request duration in seconds",
    labelnames=["model", "node"],  # node: generator, critic, refiner
    buckets=[0.5, 1, 2, 5, 10, 30, 60, 120],
)

# M2: Time to First Token
llm_ttft_seconds = Histogram(
    "llm_ttft_seconds",
    "Time to first token in seconds",
    labelnames=["model"],
    buckets=[0.1, 0.25, 0.5, 1, 2, 5],
)

# M3: 출력 토큰 생성 속도
llm_tokens_per_second = Histogram(
    "llm_tokens_per_second",
    "Output tokens per second",
    labelnames=["model"],
    buckets=[5, 10, 20, 50, 100, 200],
)

# M4: TPOT (Time Per Output Token)
llm_time_per_output_token_seconds = Histogram(
    "llm_time_per_output_token_seconds",
    "Time per output token in seconds",
    labelnames=["model"],
    buckets=[0.005, 0.01, 0.02, 0.05, 0.1, 0.2],
)

# M5: 누적 입력 토큰
llm_input_tokens_total = Counter(
    "llm_input_tokens_total",
    "Total input tokens",
    labelnames=["model", "node"],
)

# M6: 누적 출력 토큰
llm_output_tokens_total = Counter(
    "llm_output_tokens_total",
    "Total output tokens",
    labelnames=["model", "node"],
)

# M7: 요청 수
llm_requests_total = Counter(
    "llm_requests_total",
    "Total LLM requests",
    labelnames=["model", "status", "node"],
)

# M8: 에러 요청 수
llm_request_errors_total = Counter(
    "llm_request_errors_total",
    "Total LLM request errors",
    labelnames=["model", "error_type"],
)

# M9: 현재 처리 중 요청
llm_active_requests = Gauge(
    "llm_active_requests",
    "Currently active LLM requests",
    labelnames=["model"],
)

# M10: 대기 큐 깊이
llm_queue_depth = Gauge(
    "llm_queue_depth",
    "LLM request queue depth",
)

# === Exam/Gemini 특화 신규 메트릭 (4개) ===

# M12: Gemini 429 응답 횟수
gemini_rate_limit_hits_total = Counter(
    "gemini_rate_limit_hits_total",
    "Gemini API 429 rate limit hits",
)

# M13: RPM 잔여 슬롯
gemini_rpm_remaining = Gauge(
    "gemini_rpm_remaining",
    "Gemini remaining RPM slots (out of 10)",
)

# M14: Quality Gate 통과/미달
exam_quality_gate_total = Counter(
    "exam_quality_gate_total",
    "Quality gate results",
    labelnames=["result"],  # "passed" | "failed"
)

# M15: 전체 생성 요청 소요시간
exam_generation_duration_seconds = Histogram(
    "exam_generation_duration_seconds",
    "Total generation request duration (Celery task)",
    buckets=[10, 30, 60, 90, 120, 180],
)
```

### E.2 /metrics 엔드포인트 구현

```python
# apps/ai/api/metrics_view.py
from django.http import HttpResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

def metrics_view(request):
    """Prometheus scrape 엔드포인트"""
    return HttpResponse(
        generate_latest(),
        content_type=CONTENT_TYPE_LATEST,
    )
```

```python
# examonline/urls.py에 추가 (인증 불필요 — Prometheus scraper 접근)
path("metrics", metrics_view, name="prometheus-metrics"),
```

의존성: `prometheus_client` (pyproject.toml에 추가)

### E.3 LangFuse 통합 (Graceful Degradation 3단계)

> 기존 패턴 참조: BRD Section 8.5 (fAInancial-agent 패턴)

```python
# apps/ai/observability/langfuse_handler.py

def get_langfuse_handler(generation_id: str | None = None):
    """
    LangFuse CallbackHandler 생성 (3단계 graceful degradation)

    1단계: 패키지 미설치 → None 반환
    2단계: 환경변수 미설정 → None 반환
    3단계: 초기화 예외 → None 반환, 로그 경고

    None 반환 시 파이프라인은 callback 없이 정상 동작.
    """
    # 1단계: 패키지 미설치
    try:
        from langfuse.callback import CallbackHandler
    except ImportError:
        return None

    # 2단계: 환경변수 미설정
    from django.conf import settings
    public_key = getattr(settings, "LANGFUSE_PUBLIC_KEY", None)
    secret_key = getattr(settings, "LANGFUSE_SECRET_KEY", None)
    host = getattr(settings, "LANGFUSE_HOST", None)

    if not all([public_key, secret_key]):
        return None

    # 3단계: 초기화 예외
    try:
        return CallbackHandler(
            public_key=public_key,
            secret_key=secret_key,
            host=host or "https://cloud.langfuse.com",
            session_id=generation_id,
        )
    except Exception:
        import logging
        logging.getLogger(__name__).warning(
            "LangFuse initialization failed, continuing without tracing"
        )
        return None
```

**파이프라인 통합**:
```python
# LangGraph config에 callback 주입
langfuse_handler = get_langfuse_handler(str(generation_id))
config = {}
if langfuse_handler:
    config["callbacks"] = [langfuse_handler]

result = pipeline.invoke(initial_state, config=config)
```

### E.4 Grafana 대시보드 패널 구성

`charts/exam-platform/grafana/llm-overview.json`:

| 패널 | 메트릭 | 타입 |
|------|--------|------|
| LLM Request Rate | `rate(llm_requests_total[5m])` | Time Series |
| Request Duration P50/P95/P99 | `histogram_quantile(0.95, llm_request_duration_seconds)` | Time Series |
| Token Usage | `rate(llm_input_tokens_total[5m])`, `rate(llm_output_tokens_total[5m])` | Time Series |
| Active Requests | `llm_active_requests` | Gauge |
| Error Rate | `rate(llm_request_errors_total[5m]) / rate(llm_requests_total[5m])` | Stat |
| Gemini RPM Remaining | `gemini_rpm_remaining` | Gauge |
| Rate Limit Hits | `rate(gemini_rate_limit_hits_total[5m])` | Time Series |
| Quality Gate Pass Rate | `rate(exam_quality_gate_total{result="passed"}[1h]) / rate(exam_quality_gate_total[1h])` | Stat |
| Generation Duration | `histogram_quantile(0.5, exam_generation_duration_seconds)` | Time Series |
| Tokens Per Second | `histogram_quantile(0.5, llm_tokens_per_second)` | Stat |

---

## F. 환경 변수 & 설정 명세

### F.1 신규 환경 변수

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `LLM_PROVIDER` | str | `"ollama"` | LLM 제공자 (`ollama` / `gemini`) |
| `OLLAMA_BASE_URL` | str | `"http://localhost:11434"` | Ollama API 주소 |
| `OLLAMA_MODEL` | str | `"llama3.2"` | Ollama 모델명 |
| `GEMINI_API_KEY` | str | `""` | Gemini API Key (gemini 모드 필수) |
| `GEMINI_MODEL` | str | `"gemini-2.5-flash"` | Gemini 모델명 |
| `CELERY_BROKER_URL` | str | `REDIS_URL` 재사용 | Celery broker (Redis) |
| `CELERY_RESULT_BACKEND` | str | `REDIS_URL` 재사용 | Celery result backend |
| `LANGFUSE_PUBLIC_KEY` | str | `""` (optional) | LangFuse Public Key |
| `LANGFUSE_SECRET_KEY` | str | `""` (optional) | LangFuse Secret Key |
| `LANGFUSE_HOST` | str | `"https://cloud.langfuse.com"` | LangFuse 호스트 |
| `EMBEDDING_MODEL` | str | `"all-MiniLM-L6-v2"` | Sentence Transformer 모델 |

### F.2 Django settings 변경

**config/base.py**:
```python
INSTALLED_APPS = [
    # ... 기존 ...
    "ai",  # 신규 AI 앱 추가
]

# Celery 설정
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Seoul"
CELERY_TASK_TRACK_STARTED = True

# LLM Provider
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "ollama")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# Embedding
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# LangFuse (optional)
LANGFUSE_PUBLIC_KEY = os.environ.get("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SECRET_KEY = os.environ.get("LANGFUSE_SECRET_KEY", "")
LANGFUSE_HOST = os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")
```

**config/api.py** 변경:
```python
SPECTACULAR_SETTINGS["TAGS"].append(
    {"name": "ai-materials", "description": "AI 교재 관리 API"},
)
SPECTACULAR_SETTINGS["TAGS"].append(
    {"name": "ai-generate", "description": "AI 문제 생성 API"},
)
SPECTACULAR_SETTINGS["TAGS"].append(
    {"name": "ai-feedback", "description": "AI 피드백 API"},
)
```

### F.3 docker-compose 변경

**제거**:
- `mongodb` 서비스 전체
- `mongodb_data` 볼륨
- `backend` 서비스의 MongoDB 환경 변수
- `backend.depends_on.mongodb`

**추가 — Celery Worker 서비스**:

```yaml
  celery-worker:
    build:
      context: ./examonline
      dockerfile: Dockerfile
    container_name: examonline-celery-worker
    command: ["celery", "-A", "celery_app", "worker", "--loglevel=info", "--concurrency=2"]
    environment:
      - DJANGO_SETTINGS_MODULE=config.production
      - SECRET_KEY=${SECRET_KEY}
      - POSTGRES_DB=${POSTGRES_DB:-examonline}
      - POSTGRES_USER=${POSTGRES_USER:-examuser}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - LLM_PROVIDER=${LLM_PROVIDER:-ollama}
      - OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434}
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
      - GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.5-flash}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
```

**추가 — postgres 서비스 변경 (pgvector)**:

```yaml
  postgres:
    image: pgvector/pgvector:pg18  # postgres:18-alpine → pgvector 이미지로 변경
```

또는 기존 이미지 유지 후 migration에서 `CREATE EXTENSION IF NOT EXISTS vector;` 실행.

### F.4 pyproject.toml 변경

```toml
dependencies = [
    # ... 기존 유지 ...
    # pymongo 제거
    # 신규 추가
    "celery>=5.4",
    "langgraph>=0.2",
    "langchain-core>=0.3",
    "pgvector>=0.3",
    "django-pgvector>=0.2",
    "pdfplumber>=0.11",
    "sentence-transformers>=3.0",
    "google-generativeai>=0.8",
    "httpx>=0.27",
    "prometheus-client>=0.21",
]

[project.optional-dependencies]
dev = [
    # ... 기존 유지 ...
]
observability = [
    "langfuse>=3.0,<4",
]
```

---

## G. 테스트 명세

### G.1 AI 테스트 Fixture

> 기존 패턴 참조: `conftest.py:1-22` (autouse cache fixture)

```python
# examonline/conftest.py에 추가

@pytest.fixture
def subject(db):
    """테스트용 과목"""
    from user.models import SubjectInfo
    return SubjectInfo.objects.create(subject_name="컴퓨터과학")


@pytest.fixture
def teacher_user(db):
    """테스트용 교사"""
    from user.models import UserProfile
    return UserProfile.objects.create_user(
        username="teacher_ai_test",
        password="testpass123",
        user_type="teacher",
        nick_name="AI테스트교사",
    )


@pytest.fixture
def material(db, subject, teacher_user):
    """테스트용 교재"""
    from ai.models import MaterialInfo
    return MaterialInfo.objects.create(
        subject=subject,
        filename="test_material.pdf",
        chunk_count=5,
        status="ready",
        uploaded_by=teacher_user,
    )


@pytest.fixture
def material_chunks(db, material):
    """테스트용 교재 청크 (임베딩 포함)"""
    from ai.models import MaterialChunk
    import numpy as np

    chunks = []
    for i in range(5):
        chunk = MaterialChunk.objects.create(
            material=material,
            content=f"테스트 청크 내용 {i}. 컴퓨터과학 기본 개념.",
            embedding=np.random.rand(768).tolist(),
            page_number=i + 1,
            chunk_index=i,
        )
        chunks.append(chunk)
    return chunks


@pytest.fixture
def generation_request(db, subject, teacher_user, material):
    """테스트용 생성 요청"""
    from ai.models import GenerationRequest
    return GenerationRequest.objects.create(
        subject=subject,
        requested_by=teacher_user,
        question_count=5,
        type_distribution={"xz": 0.6, "pd": 0.3, "tk": 0.1},
        difficulty_distribution={"jd": 0.3, "zd": 0.5, "kn": 0.2},
        material_ids=[material.id],
        status="generating",
    )
```

### G.2 LLM Mock 전략

```python
# apps/ai/tests/conftest.py

@pytest.fixture
def mock_llm_provider():
    """LLM Provider mock — 테스트에서 실제 LLM 호출 방지"""
    from unittest.mock import MagicMock
    from ai.llm.base import LLMResponse

    provider = MagicMock()

    # Generator mock 응답
    generator_response = LLMResponse(
        content=json.dumps([
            {
                "name": "테스트 문제 1",
                "content": "다음 중 올바른 것은?",
                "tq_type": "xz",
                "tq_degree": "zd",
                "options": [
                    {"option": "보기 A", "is_right": False},
                    {"option": "보기 B", "is_right": True},
                    {"option": "보기 C", "is_right": False},
                    {"option": "보기 D", "is_right": False},
                ],
                "answer": None,
            }
        ]),
        input_tokens=500,
        output_tokens=300,
        model="mock/test",
        duration_seconds=0.1,
    )
    provider.generate.return_value = generator_response
    provider.generate_json.return_value = json.loads(generator_response.content)
    provider.model_name = "mock/test"

    return provider


@pytest.fixture(autouse=True)
def _patch_llm_provider(mock_llm_provider, monkeypatch):
    """모든 AI 테스트에서 LLM Provider를 자동 mock"""
    monkeypatch.setattr(
        "ai.llm.factory.get_llm_provider",
        lambda: mock_llm_provider,
    )
```

**Mock 대상 함수**:
- `ai.llm.factory.get_llm_provider` — Provider 팩토리 (모든 LLM 호출 차단)
- `ai.services.rag.get_embedding_model` — Sentence Transformer 모델 (테스트에서 랜덤 벡터 사용)

### G.3 pgvector 테스트 DB 설정

```python
# apps/ai/tests/conftest.py

@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """pgvector extension 생성 (테스트 DB)"""
    with django_db_blocker.unblock():
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
```

CI 환경에서는 pgvector 포함 PostgreSQL 이미지 사용:
```yaml
# .github/workflows/test.yml
services:
  postgres:
    image: pgvector/pgvector:pg18
```

### G.4 테스트 파일 구조

```
apps/ai/
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # AI-specific fixtures, LLM mock, pgvector setup
│   ├── test_models.py       # 모델 생성, 관계, 제약조건
│   ├── test_views.py        # API 엔드포인트 (ViewSet, APIView)
│   ├── test_serializers.py  # Serializer validation
│   ├── test_services.py     # RAG 서비스, Feedback 서비스
│   ├── test_pipeline.py     # LangGraph 파이프라인 상태 전환
│   ├── test_llm_adapters.py # LLM Provider 어댑터 (Ollama/Gemini mock)
│   └── test_tasks.py        # Celery task (task 실행, 재시도, 타임아웃)
```

#### test_models.py 주요 테스트 케이스

```python
class TestMaterialInfo:
    def test_create_material(self, subject, teacher_user)
    def test_soft_delete(self, material)
    def test_subject_protect_on_delete(self, material)
    def test_str_returns_filename(self, material)

class TestMaterialChunk:
    def test_create_chunk_with_embedding(self, material)
    def test_cascade_delete_with_material(self, material, material_chunks)

class TestGenerationRequest:
    def test_create_with_uuid_pk(self, subject, teacher_user)
    def test_status_transitions(self, generation_request)

class TestGeneratedQuestion:
    def test_create_with_quality_score(self, generation_request)
    def test_tq_type_choices_match_existing(self)  # TestQuestionInfo와 동일 choices 검증

class TestTeacherFeedback:
    def test_approve_creates_saved_question(self, teacher_user, generation_request)
    def test_reject_stores_reason(self, teacher_user, generation_request)
```

#### test_views.py 주요 테스트 케이스

```python
class TestMaterialUpload:
    def test_upload_pdf_returns_201(self, teacher_client)
    def test_upload_non_pdf_returns_400(self, teacher_client)
    def test_non_teacher_returns_403(self, student_client)

class TestGenerateView:
    def test_generate_returns_202(self, teacher_client, material)
    def test_invalid_question_count_returns_400(self, teacher_client)
    def test_type_distribution_sum_validation(self, teacher_client)
    def test_throttle_rate_limit(self, teacher_client)

class TestGenerateDetailView:
    def test_poll_generating_status(self, teacher_client, generation_request)
    def test_poll_completed_with_questions(self, teacher_client)
    def test_other_user_returns_404(self, other_teacher_client)

class TestFeedbackView:
    def test_approve_creates_test_question(self, teacher_client)
    def test_reject_requires_reason(self, teacher_client)
    def test_edit_stores_original_and_edited(self, teacher_client)
```

#### test_pipeline.py 주요 테스트 케이스

```python
class TestPipelineStateTransitions:
    def test_all_pass_skips_refiner(self, mock_llm_provider)
    def test_failed_triggers_refiner(self, mock_llm_provider)
    def test_max_rounds_stops_refinement(self, mock_llm_provider)
    def test_saves_results_on_completion(self, mock_llm_provider)

class TestQualityGate:
    def test_accuracy_below_5_fails(self)
    def test_total_below_14_fails(self)
    def test_all_criteria_met_passes(self)
```

---

## H. 프로젝트 디렉토리 구조

```
examonline/apps/ai/
├── __init__.py
├── apps.py                    # AppConfig (heavy import 금지)
├── models.py                  # A절 전체 모델
├── admin.py
├── tasks.py                   # C.3 Celery tasks
├── celery_app.py              # C.4 Celery config (examonline/ 루트)
├── api/
│   ├── __init__.py
│   ├── urls.py                # B.6 URL 라우팅
│   ├── views.py               # B.1~B.3 View 클래스
│   ├── serializers.py         # B.4 Serializer 전체
│   ├── filters.py             # B.5 FilterSet
│   ├── throttles.py           # B.7 Throttle
│   └── metrics_view.py        # E.2 /metrics
├── llm/
│   ├── __init__.py
│   ├── base.py                # D.1 Protocol
│   ├── ollama.py              # D.2 Ollama
│   ├── gemini.py              # D.3 Gemini
│   ├── rate_limiter.py        # D.4 Rate Limiter
│   └── factory.py             # D.5 Factory
├── services/
│   ├── __init__.py
│   ├── pipeline.py            # C.1~C.2 LangGraph 파이프라인
│   ├── rag.py                 # RAG 서비스 (청킹, 임베딩, 검색)
│   └── feedback.py            # Feedback 서비스 (승인→저장, 통계)
├── observability/
│   ├── __init__.py
│   ├── metrics.py             # E.1 Prometheus 메트릭 정의
│   └── langfuse_handler.py    # E.3 LangFuse graceful degradation
├── migrations/
│   └── 0001_initial.py        # pgvector extension + 모델 + HNSW index
└── tests/                     # G.4 테스트 전체
    ├── __init__.py
    ├── conftest.py
    ├── test_models.py
    ├── test_views.py
    ├── test_serializers.py
    ├── test_services.py
    ├── test_pipeline.py
    ├── test_llm_adapters.py
    └── test_tasks.py
```

---

## I. apps.py 명세 (Lazy Import 제약)

> BRD Section 8.0 제약 #2: apps/ai/apps.py의 ready()에서 heavy import 금지

```python
# apps/ai/apps.py
from django.apps import AppConfig


class AiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ai"
    verbose_name = "AI 출제 시스템"

    def ready(self):
        # Heavy import 금지 (langgraph, sentence_transformers, pgvector 등)
        # 실제 호출 시점에 lazy import
        pass
```

---

## J. Migration 명세

### 0001_initial.py

```python
from django.db import migrations

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("user", "0001_initial"),
        ("testquestion", "0001_initial"),
    ]

    operations = [
        # pgvector extension 생성
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),
        # 모델 생성 (Django auto-generated)
        # ...
        # HNSW 인덱스 (VectorField는 Django Meta.indexes 미지원)
        migrations.RunSQL(
            sql="""
                CREATE INDEX materialchunk_embedding_hnsw_idx
                ON ai_materialchunk
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            """,
            reverse_sql="DROP INDEX IF EXISTS materialchunk_embedding_hnsw_idx;",
        ),
    ]
```

---

## K. 기존 코드 수정 범위 (최소)

| 파일 | 변경 내용 | 영향 |
|------|-----------|------|
| `config/base.py` | `INSTALLED_APPS += ["ai"]`, Celery/LLM 설정 | 기존 앱 동작 무관 |
| `config/api.py` | `SPECTACULAR_SETTINGS["TAGS"]` AI 태그 추가, throttle rate 추가 | 기존 API 무관 |
| `examonline/urls.py` | `path("api/v1/ai/", include("ai.api.urls"))` 추가 | 기존 URL 무관 |
| `pyproject.toml` | 의존성 추가, pymongo 제거 | 기존 테스트 무관 |
| `conftest.py` | AI fixture 추가 (autouse 아님) | 기존 fixture 무관 |
| `docker-compose.yml` | mongodb 제거, celery-worker 추가, postgres pgvector | 기존 서비스 무관 |

**기존 모델 변경: 0건**
**기존 API 변경: 0건**
**기존 테스트 영향: 0건** (AI fixture는 `autouse=False`)

---

# Part 2: Frontend + Integration 요구사항 명세

> **담당**: Worktree B (`feature/ai-frontend`, frontend/ 전용)
> **기존 패턴 참조 기준**: 실제 코드 분석 완료

---

## L. 타입 정의 (`frontend/src/types/ai.ts`)

> 기존 패턴 참조: `frontend/src/types/question.ts:1-3` (string union type 패턴)

```typescript
export type GenerationStatus = 'generating' | 'reviewing' | 'completed' | 'failed'
export type MaterialStatus = 'processing' | 'ready' | 'error'
export type FeedbackAction = 'approve' | 'reject' | 'edit'

// 교재
export interface Material {
  id: number
  filename: string
  subject: { id: number; subject_name: string }
  chunk_count: number
  status: MaterialStatus
  created_at: string
}

export interface MaterialListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Material[]
}

export interface UploadMaterialRequest {
  file: File
  subject_id: number
}

// 문제 생성
export interface TypeDistribution { xz: number; pd: number; tk: number }
export interface DifficultyDistribution { jd: number; zd: number; kn: number }

export interface GenerateRequest {
  subject_id: number
  material_ids: number[]
  question_count: number
  type_distribution: TypeDistribution
  difficulty_distribution: DifficultyDistribution
}

export interface GenerateStartResponse {
  generation_id: string
  status: 'generating'
  estimated_time: number
}

// 품질 점수
export interface QualityScore {
  accuracy: number; pedagogical: number; difficulty: number; clarity: number
  total: number; passed: boolean
}

// 생성된 문제
export interface GeneratedOption { option: string; is_right: boolean }
export interface SourceReference { material_id: number; chunk_text: string; page_number: number | null }

export interface GeneratedQuestion {
  temp_id: string
  name: string; content: string
  tq_type: 'xz' | 'pd' | 'tk'
  tq_degree: 'jd' | 'zd' | 'kn'
  options: GeneratedOption[]
  answer: string
  source_reference: SourceReference | null
  quality_score: QualityScore
  critique_rounds: number
}

export interface GenerationStats {
  total_generated: number; passed: number; failed: number; avg_quality_score: number
}

export interface GenerationStatusResponse {
  status: GenerationStatus
  questions: GeneratedQuestion[]
  stats: GenerationStats
}

// 교사 피드백
export interface EditedContent {
  name?: string; content?: string; options?: GeneratedOption[]; answer?: string; tq_degree?: string
}

export interface SubmitFeedbackRequest {
  generation_id: string; temp_id: string; action: FeedbackAction
  reject_reason?: string | null; edited_content?: EditedContent | null
}

export interface SubmitFeedbackResponse {
  feedback_id: number; question_id: number | null; status: 'saved'
}

// 피드백 통계
export interface FeedbackTrendItem { date: string; approval_rate: number; count: number }

export interface FeedbackStats {
  total_generated: number; approved: number; rejected: number; edited: number
  approval_rate: number; trend: FeedbackTrendItem[]
}
```

---

## M. API 클라이언트 (`frontend/src/api/ai.ts`)

> 기존 패턴 참조: `frontend/src/api/question.ts:11` (named export 객체 패턴)

```typescript
import apiClient from './client'
import type { /* 위 타입들 */ } from '@/types/ai'

export const aiApi = {
  uploadMaterial: async (data: UploadMaterialRequest): Promise<Material> => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('subject_id', String(data.subject_id))
    const response = await apiClient.post<Material>('/v1/ai/materials/upload/', formData,
      { headers: { 'Content-Type': 'multipart/form-data' } })
    return response.data
  },
  getMaterials: async (params?: { page?: number }): Promise<MaterialListResponse> => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    return (await apiClient.get<MaterialListResponse>(`/v1/ai/materials/?${query}`)).data
  },
  deleteMaterial: async (id: number): Promise<void> => { await apiClient.delete(`/v1/ai/materials/${id}/`) },
  startGeneration: async (data: GenerateRequest): Promise<GenerateStartResponse> =>
    (await apiClient.post<GenerateStartResponse>('/v1/ai/generate/', data)).data,
  getGenerationStatus: async (id: string): Promise<GenerationStatusResponse> =>
    (await apiClient.get<GenerationStatusResponse>(`/v1/ai/generate/${id}/`)).data,
  submitFeedback: async (data: SubmitFeedbackRequest): Promise<SubmitFeedbackResponse> =>
    (await apiClient.post<SubmitFeedbackResponse>('/v1/ai/feedback/', data)).data,
  getFeedbackStats: async (): Promise<FeedbackStats> =>
    (await apiClient.get<FeedbackStats>('/v1/ai/feedback/stats/')).data,
}
```

### TanStack Query Hooks

```typescript
// 생성 상태 polling (3초 간격, completed/failed 시 중단)
export const useGenerationStatus = (generationId: string | null) =>
  useQuery({
    queryKey: ['ai-generation', generationId],
    queryFn: () => aiApi.getGenerationStatus(generationId!),
    enabled: !!generationId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return (status === 'completed' || status === 'failed') ? false : 3000
    },
  })
```

---

## N. 페이지 컴포넌트 명세

### N-1. 신규 페이지 5개

| 페이지 | 파일 | 핵심 상태 | UI |
|--------|------|----------|-----|
| MaterialUploadPage | `features/ai/MaterialUploadPage.tsx` | useQuery(materials) + uploadMutation + deleteMutation | 파일 업로드 폼 + 교재 목록 + StatusBadge |
| GeneratePage | `features/ai/GeneratePage.tsx` | react-hook-form + zodResolver + startMutation | 과목/교재/문제수/유형비율/난이도 폼 |
| GenerationStatusPage | `features/ai/GenerationStatusPage.tsx` | useQuery(polling 3초) + useEffect(completed→navigate) | 진행 상태 + 통계 카드 |
| ReviewPage | `features/ai/ReviewPage.tsx` | useQuery(generation) + feedbackMutation | 문제 목록 + 승인/거부/수정 버튼 + 모달 |
| TeacherDashboard AI 섹션 | `features/dashboard/TeacherDashboard.tsx` (수정) | useQuery(feedbackStats) | 통계 카드 4개 + InteractiveBarChart(승인율 추이) |

### N-2. 서브 컴포넌트 3개

| 컴포넌트 | 파일 | 용도 |
|----------|------|------|
| QualityScoreBadge | `features/ai/components/QualityScoreBadge.tsx` | 점수 시각화 (total/20 + passed/failed 뱃지) |
| RejectReasonModal | `features/ai/components/RejectReasonModal.tsx` | 거부 사유 카테고리 + 직접 입력 |
| EditQuestionModal | `features/ai/components/EditQuestionModal.tsx` | 문제 인라인 수정 |

---

## O. 라우트 & 네비게이션

### 신규 라우트 4개 (App.tsx)

> 기존 패턴 참조: `App.tsx:92-103` (teacher-only beforeLoad)

| 경로 | 컴포넌트 | 접근 | params |
|------|----------|------|--------|
| `/ai/materials` | MaterialUploadPage | 교사 전용 | — |
| `/ai/generate` | GeneratePage | 교사 전용 | — |
| `/ai/status` | GenerationStatusPage | 교사 전용 | ?generationId=uuid |
| `/ai/review` | ReviewPage | 교사 전용 | ?generationId=uuid |

### 사이드바 메뉴 (Sidebar.tsx)

> 기존 패턴 참조: `Sidebar.tsx:47-55` (teacherNavItems)

```typescript
// 문제 관리와 시험지 관리 사이에 삽입
{ label: 'AI 출제', path: '/ai/materials', icon: Wand2 }
// /ai/* 전체를 active로 처리
```

---

## P. MSW Mock 명세

### Mock Handlers (`__tests__/mocks/ai-handlers.ts`)

8개 엔드포인트 핸들러: materials(3) + generate(2) + feedback(2) + stats(1)

### Mock Fixture (`__tests__/mocks/fixtures/ai.ts`)

```typescript
mockMaterial: { id: 1, filename: '컴퓨터과학개론.pdf', status: 'ready', chunk_count: 48 }
mockQualityScore: { accuracy: 5, pedagogical: 4, difficulty: 4, clarity: 4, total: 17, passed: true }
mockGeneratedQuestion: { temp_id: 'uuid', name: '운영체제의 역할', tq_type: 'xz', ... }
mockGenerationCompleted: { status: 'completed', questions: [...], stats: { passed: 4, failed: 1 } }
mockFeedbackStats: { total_generated: 42, approved: 35, approval_rate: 0.833, trend: [...] }
```

---

## Q. Frontend 테스트 명세

### 테스트 파일 4개

| 파일 | 테스트 항목 |
|------|-----------|
| `__tests__/api/ai.test.ts` | API 클라이언트 8개 함수 + 에러 처리 |
| `__tests__/features/ai/MaterialUploadPage.test.tsx` | 목록 렌더링, StatusBadge, 삭제 |
| `__tests__/features/ai/ReviewPage.test.tsx` | 문제 목록, 품질 뱃지, 승인/거부/수정 액션 |
| `__tests__/features/ai/GenerationStatusPage.test.tsx` | polling, completed 이동, failed 에러 |

### 상태 관리: Zustand 스토어 **불필요**

generationId는 URL search params로 관리. TanStack Query가 서버 상태 담당.

---

## R. Frontend 디렉토리 구조

```
frontend/src/
├── types/ai.ts                         [신규]
├── api/ai.ts                           [신규]
├── features/ai/
│   ├── MaterialUploadPage.tsx          [신규]
│   ├── GeneratePage.tsx                [신규]
│   ├── GenerationStatusPage.tsx        [신규]
│   ├── ReviewPage.tsx                  [신규]
│   └── components/
│       ├── QualityScoreBadge.tsx       [신규]
│       ├── RejectReasonModal.tsx       [신규]
│       └── EditQuestionModal.tsx       [신규]
├── features/dashboard/
│   └── TeacherDashboard.tsx            [수정] AI 통계 섹션 추가 (line 376 위)
├── components/layout/Sidebar.tsx        [수정] AI 출제 메뉴 추가
├── App.tsx                              [수정] AI 라우트 4개 추가
└── __tests__/
    ├── api/ai.test.ts                  [신규]
    ├── features/ai/*.test.tsx          [신규] 3개
    └── mocks/
        ├── ai-handlers.ts             [신규]
        ├── fixtures/ai.ts             [신규]
        └── server.ts                  [수정] aiHandlers 통합
```
