-- dtb-main: dailytoolbox 서버 기능을 모으는 D1. 표 이름 = <기능 앞머리>_<무엇>. 이 파일 = 편입 모의고사 '응시자 중 내 위치'
-- 사람별 줄은 두지 않는다(IP·기기·시각 없음). 400일 지우기는 worker.js scheduled()
CREATE TABLE IF NOT EXISTS tf_rank_dist (
  school TEXT NOT NULL,     -- TF_RANK_SCHOOLS slug
  round  INTEGER NOT NULL,  -- 1~TF_RANK_ROUNDS
  ver    TEXT NOT NULL,     -- 판 글자('1','2'…) = TF_RANK_VERS 가 준 값
  b      TEXT NOT NULL,     -- 101칸 JSON 정수 배열, i번 칸 = 100점 기준 i점 인원
  n      INTEGER NOT NULL,  -- b 합
  d      TEXT NOT NULL,     -- 마지막 저장 UTC 날 YYYYMMDD
  w      INTEGER NOT NULL,  -- d 날 저장 수(회차당 하루 몫 판단)
  PRIMARY KEY (school, round, ver)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS tf_rank_day (
  day    TEXT NOT NULL,     -- UTC 날 YYYYMMDD (관리자 페이지 '날짜별 응시 수' 재료)
  school TEXT NOT NULL,
  round  INTEGER NOT NULL,
  ver    TEXT NOT NULL,
  n      INTEGER NOT NULL,
  PRIMARY KEY (day, school, round, ver)
) WITHOUT ROWID;
