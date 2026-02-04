/**
 * E2E 테스트용 선택자 정의
 */

export const selectors = {
  // Auth 페이지
  auth: {
    login: {
      usernameInput: 'input[id="username"]',
      passwordInput: 'input[id="password"]',
      submitButton: 'button[type="submit"]',
      registerLink: 'button:has-text("회원가입")',
      rememberCheckbox: 'input[id="remember"]',
      studentRoleButton: 'button:has-text("학생")',
      teacherRoleButton: 'button:has-text("교사")',
    },
    register: {
      usernameInput: 'input[id="username"]',
      nicknameInput: 'input[id="nick_name"]',
      emailInput: 'input[id="email"]',
      passwordInput: 'input[id="password"]',
      confirmPasswordInput: 'input[id="confirmPassword"]',
      studentRoleButton: 'button:has-text("학생")',
      teacherRoleButton: 'button:has-text("교사")',
      submitButton: 'button[type="submit"]',
      loginLink: 'button:has-text("로그인")',

      // Student 전용 필드
      gradeSelect: 'select[id="grade"]',
      classNumberInput: 'input[id="class_number"]',
      studentNumberInput: 'input[id="student_number"]',

      // Teacher 전용 필드
      departmentInput: 'input[id="department"]',
    },
  },

  // Dashboard
  dashboard: {
    studentDashboard: {
      examsSection: 'section:has-text("진행 중인 시험")',
      examCard: '.exam-card',
      startExamButton: 'button:has-text("시험 시작")',
    },
    teacherDashboard: {
      questionsSection: 'section:has-text("문제 관리")',
      testPapersSection: 'section:has-text("시험지 관리")',
      examinationsSection: 'section:has-text("시험 관리")',
    },
  },

  // Navigation
  nav: {
    dashboardLink: 'a[href="/"]',
    questionsLink: 'a[href="/questions"]',
    testPapersLink: 'a[href="/testpapers"]',
    examinationsLink: 'a[href="/examinations"]',
    profileLink: 'a[href="/profile"]',
    logoutButton: 'button:has-text("로그아웃")',
  },

  // Question 관리
  question: {
    createButton: 'button:has-text("문제 추가")',
    searchInput: 'input[placeholder*="검색"]',
    filterSelect: 'select[name="subject"]',

    form: {
      subjectSelect: 'select[id="subject"]',
      titleInput: 'input[id="title"]',
      contentTextarea: 'textarea[id="content"]',
      typeSelect: 'select[id="question_type"]',
      difficultySelect: 'select[id="difficulty"]',

      // 객관식 전용
      option1Input: 'input[id="option1"]',
      option2Input: 'input[id="option2"]',
      option3Input: 'input[id="option3"]',
      option4Input: 'input[id="option4"]',
      correctAnswerSelect: 'select[id="correct_option"]',

      // 주관식 전용
      answerTextarea: 'textarea[id="answer"]',

      submitButton: 'button[type="submit"]',
      cancelButton: 'button:has-text("취소")',
    },
  },

  // TestPaper 관리
  testPaper: {
    createButton: 'button:has-text("시험지 추가")',
    searchInput: 'input[placeholder*="검색"]',

    form: {
      titleInput: 'input[id="title"]',
      descriptionTextarea: 'textarea[id="description"]',
      subjectSelect: 'select[id="subject"]',

      questionList: '.question-list',
      addQuestionButton: 'button:has-text("문제 추가")',
      removeQuestionButton: 'button:has-text("제거")',
      scoreInput: 'input[type="number"]',

      totalScoreDisplay: '.total-score',
      submitButton: 'button[type="submit"]',
      cancelButton: 'button:has-text("취소")',
    },
  },

  // Examination 관리
  examination: {
    createButton: 'button:has-text("시험 추가")',
    searchInput: 'input[placeholder*="검색"]',

    form: {
      titleInput: 'input[id="title"]',
      descriptionTextarea: 'textarea[id="description"]',
      testPaperSelect: 'select[id="test_paper"]',

      startDateInput: 'input[id="start_date"]',
      startTimeInput: 'input[id="start_time"]',
      endDateInput: 'input[id="end_date"]',
      endTimeInput: 'input[id="end_time"]',
      durationInput: 'input[id="duration"]',

      studentSearchInput: 'input[placeholder*="학생 검색"]',
      addStudentButton: 'button:has-text("학생 추가")',
      removeStudentButton: 'button:has-text("제거")',
      studentList: '.student-list',

      publishCheckbox: 'input[id="publish"]',
      submitButton: 'button[type="submit"]',
      cancelButton: 'button:has-text("취소")',
    },
  },

  // Exam 응시
  exam: {
    take: {
      examTitle: 'h1',
      timerDisplay: '.timer',
      questionContainer: '.question-container',
      questionTitle: '.question-title',
      questionContent: '.question-content',

      // 객관식
      option1Radio: 'input[value="1"]',
      option2Radio: 'input[value="2"]',
      option3Radio: 'input[value="3"]',
      option4Radio: 'input[value="4"]',

      // 주관식
      answerTextarea: 'textarea[name="answer"]',

      prevButton: 'button:has-text("이전")',
      nextButton: 'button:has-text("다음")',
      submitButton: 'button:has-text("제출")',

      confirmDialog: '.confirm-dialog',
      confirmButton: 'button:has-text("확인")',
      cancelButton: 'button:has-text("취소")',
    },

    result: {
      scoreDisplay: '.score-display',
      totalScoreDisplay: '.total-score',
      passStatusDisplay: '.pass-status',
      questionResults: '.question-results',
      correctAnswerDisplay: '.correct-answer',
      userAnswerDisplay: '.user-answer',
    },
  },

  // Common UI
  common: {
    loadingSpinner: '.loading-spinner',
    errorMessage: '.error-message',
    successMessage: '.success-message',
    confirmDialog: '.confirm-dialog',
    modal: '.modal',
    closeButton: 'button:has-text("닫기")',
  },
}
