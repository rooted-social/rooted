-- 1. classes 테이블에 조회수 컬럼 추가
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;

-- 2. 클래스 조회수 증가 함수 생성
CREATE OR REPLACE FUNCTION increment_class_views()
RETURNS TRIGGER AS $$
BEGIN
  -- views 컬럼이 NULL인 경우 0으로 초기화
  IF NEW.views IS NULL THEN
    NEW.views = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. classes 테이블의 views 컬럼을 위한 트리거 생성
DROP TRIGGER IF EXISTS trigger_increment_class_views ON classes;
CREATE TRIGGER trigger_increment_class_views
  BEFORE UPDATE OF views ON classes
  FOR EACH ROW
  EXECUTE FUNCTION increment_class_views();

-- 4. 조회수 증가를 위한 RPC 함수 생성
CREATE OR REPLACE FUNCTION increment_class_view_count(class_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE classes 
  SET views = COALESCE(views, 0) + 1 
  WHERE id = class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC 함수에 대한 권한 설정
GRANT EXECUTE ON FUNCTION increment_class_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_class_view_count(uuid) TO anon;

-- 6. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_classes_views ON classes(views DESC);
