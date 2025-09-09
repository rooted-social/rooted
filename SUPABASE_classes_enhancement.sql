-- 1. classes 테이블에 user_id 컬럼 추가
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. 사용자별 클래스 수강 완료 상태를 관리할 새 테이블 생성
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- 한 사용자가 같은 클래스에 대해 하나의 수강 기록만 가질 수 있도록
  UNIQUE(class_id, user_id)
);

-- 3. class_enrollments 테이블에 RLS 정책 설정
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 수강 정보를 조회할 수 있음 (커뮤니티 내에서)
CREATE POLICY "class_enrollments_select" ON class_enrollments
FOR SELECT USING (true);

-- 로그인한 사용자만 자신의 수강 정보를 생성/수정 가능
CREATE POLICY "class_enrollments_insert" ON class_enrollments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "class_enrollments_update" ON class_enrollments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "class_enrollments_delete" ON class_enrollments
FOR DELETE USING (auth.uid() = user_id);

-- 4. classes 테이블에 RLS 정책 추가 (작성자 관련)
-- 모든 사용자가 클래스를 조회할 수 있음
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes
FOR SELECT USING (true);

-- 로그인한 사용자만 클래스를 생성할 수 있음
DROP POLICY IF EXISTS "classes_insert" ON classes;
CREATE POLICY "classes_insert" ON classes
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 작성자만 자신의 클래스를 수정할 수 있음
DROP POLICY IF EXISTS "classes_update" ON classes;
CREATE POLICY "classes_update" ON classes
FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- 작성자만 자신의 클래스를 삭제할 수 있음
DROP POLICY IF EXISTS "classes_delete" ON classes;
CREATE POLICY "classes_delete" ON classes
FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 5. 업데이트 트리거 추가
CREATE OR REPLACE FUNCTION update_class_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- 완료 상태가 변경되었을 때 completed_at 업데이트
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = NOW();
  ELSIF NEW.completed = false AND OLD.completed = true THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_class_enrollments_updated_at
  BEFORE UPDATE ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_class_enrollments_updated_at();

-- 6. 기존 classes 테이블의 completed 컬럼은 더 이상 사용하지 않으므로 
--    필요하다면 나중에 제거할 수 있습니다 (하위 호환성을 위해 일단 유지)

-- 7. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user_id ON class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
