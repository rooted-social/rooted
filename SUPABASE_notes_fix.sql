-- 1단계: 현재 테이블 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'community_page_note_items';

-- 2단계: user_id 컬럼 추가
ALTER TABLE community_page_note_items 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 3단계: color 컬럼 추가 (없다면)
ALTER TABLE community_page_note_items 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#FDE68A';

-- 4단계: RLS 정책 설정
ALTER TABLE community_page_note_items ENABLE ROW LEVEL SECURITY;

-- 5단계: 모든 사용자가 노트를 조회할 수 있도록
DROP POLICY IF EXISTS "note_items_select" ON community_page_note_items;
CREATE POLICY "note_items_select" ON community_page_note_items
FOR SELECT USING (true);

-- 6단계: 로그인한 사용자만 노트 생성 가능
DROP POLICY IF EXISTS "note_items_insert" ON community_page_note_items;
CREATE POLICY "note_items_insert" ON community_page_note_items
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7단계: 작성자만 자신의 노트 수정 가능
DROP POLICY IF EXISTS "note_items_update" ON community_page_note_items;
CREATE POLICY "note_items_update" ON community_page_note_items
FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- 8단계: 작성자만 자신의 노트 삭제 가능
DROP POLICY IF EXISTS "note_items_delete" ON community_page_note_items;
CREATE POLICY "note_items_delete" ON community_page_note_items
FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 8. 업데이트 트리거 함수 생성 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. updated_at 트리거 적용
DROP TRIGGER IF EXISTS set_updated_at_trigger ON community_page_note_items;
CREATE TRIGGER set_updated_at_trigger
    BEFORE UPDATE ON community_page_note_items
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
