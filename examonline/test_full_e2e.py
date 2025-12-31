#!/usr/bin/env python3
"""
완전한 E2E 테스트: 교사 계정 생성 -> 문제/시험지/시험 생성 -> 학생 응시 -> 결과 확인
"""
import urllib.request
import json
import time
import subprocess
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"
TIMESTAMP = str(int(time.time()))

# 테스트 데이터
TEACHER_EMAIL = f"teacher_e2e_{TIMESTAMP}@test.com"
TEACHER_USERNAME = f"teacher_e2e_{TIMESTAMP}"
TEACHER_PASSWORD = "TeacherPass2025!"
TEACHER_NICKNAME = "E2E교사"

STUDENT_EMAIL = f"student_e2e_{TIMESTAMP}@test.com"
STUDENT_USERNAME = f"student_e2e_{TIMESTAMP}"
STUDENT_PASSWORD = "StudentPass2025!"
STUDENT_NICKNAME = "E2E학생"

def http_request(method, url, data=None, token=None):
    """HTTP 요청 헬퍼 함수"""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=request_data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        error_data = e.read().decode()
        print(f"HTTP Error {e.code}: {error_data}")
        raise

def register_user(email, username, password, nickname, user_type):
    """사용자 등록"""
    data = {
        "email": email,
        "username": username,
        "password": password,
        "password2": password,
        "nick_name": nickname,
        "user_type": user_type
    }

    # Add required fields based on user type
    if user_type == "teacher":
        data["teacher_name"] = nickname
        data["subject_id"] = 1  # Mathematics
        data["work_years"] = 5
        data["teacher_school"] = "E2E Test School"
    elif user_type == "student":
        data["student_name"] = nickname
        data["student_id"] = "S" + str(int(time.time()))[-6:]
        data["student_class"] = "1반"
        data["student_school"] = "E2E Test School"

    result = http_request("POST", f"{BASE_URL}/auth/register/", data)
    return result

def login_user(username, password, user_type):
    """로그인"""
    data = {
        "username": username,
        "password": password,
        "user_type": user_type
    }
    result = http_request("POST", f"{BASE_URL}/auth/token/", data)
    return result['access'], result['user']['id']

def create_question(token, name, options, correct_index):
    """문제 생성"""
    data = {
        "name": name,
        "tq_type": "xz",  # 객관식
        "tq_degree": "jd",  # 쉬움
        "subject_id": 1,  # Mathematics
        "options": [
            {
                "option": opt,
                "is_right": i == correct_index
            }
            for i, opt in enumerate(options)
        ]
    }
    return http_request("POST", f"{BASE_URL}/questions/", data, token)

def create_testpaper(token, name, question_ids):
    """시험지 생성"""
    data = {
        "name": name,
        "subject_id": 1,
        "is_shared": False
    }
    paper = http_request("POST", f"{BASE_URL}/testpapers/", data, token)

    # 문제 추가
    for question_id in question_ids:
        add_data = {
            "questions": [{"question_id": question_id, "score": 10}]
        }
        http_request("POST", f"{BASE_URL}/testpapers/{paper['id']}/add_questions/", add_data, token)

    return paper

def create_exam(token, name, paper_id):
    """시험 생성"""
    now = datetime.now()
    start_time = (now + timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%S")
    end_time = (now + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S")

    data = {
        "name": name,
        "subject_id": 1,
        "papers": [{"paper_id": paper_id}],
        "start_time": start_time,
        "end_time": end_time,
        "duration": 180,  # 3시간 (분 단위)
        "exam_type": "pt",  # 보통 시험 (pt: 보통, ts: 특수)
        "student_num": 100,
        "is_shared": True
    }
    return http_request("POST", f"{BASE_URL}/examinations/", data, token)

def get_student_profile_from_db(user_id):
    """데이터베이스에서 직접 학생 프로필 ID 조회"""
    try:
        # PostgreSQL에서 직접 조회
        import os
        env = os.environ.copy()
        env['PGPASSWORD'] = 'exampass'
        result = subprocess.run(
            ['psql', '-h', 'localhost', '-p', '5433',
             '-U', 'examuser', '-d', 'examonline', '-t', '-A', '-c',
             f"SELECT id FROM user_studentsinfo WHERE user_id = {user_id};"],
            capture_output=True,
            text=True,
            env=env
        )
        if result.returncode == 0 and result.stdout.strip():
            return int(result.stdout.strip())
    except Exception as e:
        print(f"DB query error: {e}")
    return None

def enroll_student(token, exam_id, student_id):
    """학생을 시험에 등록"""
    data = {"student_ids": [student_id]}
    return http_request("POST", f"{BASE_URL}/examinations/{exam_id}/enroll_students/", data, token)

def take_exam(token, exam_id, answers):
    """시험 응시"""
    # 시험 시작
    http_request("POST", f"{BASE_URL}/exams/{exam_id}/start/", token=token)

    time.sleep(1)

    # 답안 제출
    data = {"answers": answers}
    return http_request("POST", f"{BASE_URL}/exams/{exam_id}/submit/", data, token)

def main():
    print("=" * 60)
    print("전체 E2E 테스트 시작")
    print("=" * 60)

    # Step 1: 교사 계정 생성 및 로그인
    print("\n[Step 1] 교사 계정 생성 및 로그인")
    try:
        register_user(TEACHER_EMAIL, TEACHER_USERNAME, TEACHER_PASSWORD, TEACHER_NICKNAME, "teacher")
        print(f"✓ 교사 계정 생성: {TEACHER_USERNAME}")
    except Exception as e:
        print(f"✗ 교사 계정 생성 실패 (이미 존재할 수 있음): {e}")

    teacher_token, _ = login_user(TEACHER_USERNAME, TEACHER_PASSWORD, "teacher")
    print(f"✓ 교사 로그인 성공")

    # Step 2: 문제 생성
    print("\n[Step 2] 문제 3개 생성")
    q1 = create_question(teacher_token, "1+1은?", ["1", "2", "3", "4"], 1)
    print(f"✓ 문제 1 생성: ID={q1['id']}, 정답: 2")

    q2 = create_question(teacher_token, "2*3은?", ["5", "6", "7", "8"], 1)
    print(f"✓ 문제 2 생성: ID={q2['id']}, 정답: 6")

    q3 = create_question(teacher_token, "10-5는?", ["3", "4", "5", "6"], 2)
    print(f"✓ 문제 3 생성: ID={q3['id']}, 정답: 5")

    question_ids = [q1['id'], q2['id'], q3['id']]

    # Step 3: 시험지 생성
    print("\n[Step 3] 시험지 생성")
    paper = create_testpaper(teacher_token, f"Complete E2E Test Paper {TIMESTAMP}", question_ids)
    print(f"✓ 시험지 생성: ID={paper['id']}, 총 30점")

    # Step 4: 시험 생성
    print("\n[Step 4] 시험 생성")
    exam = create_exam(teacher_token, f"Complete E2E Exam {TIMESTAMP}", paper['id'])
    print(f"✓ 시험 생성: ID={exam['id']}")

    # Step 5: 학생 계정 생성 및 로그인
    print("\n[Step 5] 학생 계정 생성 및 로그인")
    student_profile_id = None
    try:
        reg_result = register_user(STUDENT_EMAIL, STUDENT_USERNAME, STUDENT_PASSWORD, STUDENT_NICKNAME, "student")
        print(f"✓ 학생 계정 생성: {STUDENT_USERNAME}")
        # 등록 응답에서 학생 프로필 ID 추출
        if 'student' in reg_result and 'id' in reg_result['student']:
            student_profile_id = reg_result['student']['id']
            print(f"✓ 학생 프로필 ID (from registration): {student_profile_id}")
    except Exception as e:
        print(f"✗ 학생 계정 생성 실패 (이미 존재할 수 있음): {e}")

    student_token, user_id = login_user(STUDENT_USERNAME, STUDENT_PASSWORD, "student")
    print(f"✓ 학생 로그인 성공 (User ID: {user_id})")

    # 등록에서 프로필 ID를 못 가져왔다면 DB에서 직접 조회
    if not student_profile_id:
        student_profile_id = get_student_profile_from_db(user_id)
        if student_profile_id:
            print(f"✓ 학생 프로필 ID (from DB): {student_profile_id}")
        else:
            raise Exception(f"학생 프로필 ID를 찾을 수 없습니다 (user_id: {user_id})")

    # Step 6: 학생을 시험에 등록
    print("\n[Step 6] 학생을 시험에 등록")
    enroll_result = enroll_student(teacher_token, exam['id'], student_profile_id)
    print(f"✓ 학생 등록 완료: {enroll_result['detail']}")

    # Step 7: 시험 시작 대기
    print("\n[Step 7] 시험 시작 대기 (60초)")
    time.sleep(61)  # 시험 시작 시간까지 대기

    # Step 8: 시험 응시
    print("\n[Step 8] 시험 응시")

    # 정답 찾기 (각 문제의 정답 옵션 ID)
    correct_option_ids = []
    for qid in question_ids:
        q_detail = http_request("GET", f"{BASE_URL}/questions/{qid}/", token=teacher_token)
        for opt in q_detail['options']:
            if opt['is_right']:
                correct_option_ids.append(opt['id'])
                break

    answers = [
        {"question_id": question_ids[0], "selected_options": [correct_option_ids[0]]},
        {"question_id": question_ids[1], "selected_options": [correct_option_ids[1]]},
        {"question_id": question_ids[2], "selected_options": [correct_option_ids[2]]}
    ]

    result = take_exam(student_token, exam['id'], answers)

    # Step 9: 결과 확인
    print("\n[Step 9] 결과 확인")
    print(f"✓ 시험 제출 완료")
    print(f"✓ 점수: {result['score']}/{result['total_possible']}점")
    print(f"✓ 합격 여부: {'합격' if result['passed'] else '불합격'}")

    print("\n" + "=" * 60)
    if result['score'] == 30:
        print("전체 E2E 테스트 성공! (30/30점)")
        print("모든 단계가 정상적으로 완료되었습니다.")
    else:
        print(f"전체 E2E 테스트 실패! ({result['score']}/30점)")
    print("=" * 60)

    return result['score'] == 30

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
