# Rooted - 커뮤니티 플랫폼

크리에이터와 리더들이 각자 커뮤니티를 만들고, 멤버들과 함께 지식을 공유하며 성장할 수 있는 플랫폼입니다.

## 🚀 기술 스택

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Storage**: Cloudflare R2 (이미지 업로드)
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
src/
├── app/                 # Next.js App Router 페이지
├── components/          # UI 컴포넌트 (Atomic Design)
│   └── ui/             # shadcn/ui 기본 컴포넌트
├── lib/                # 라이브러리 설정 (Supabase 등)
├── types/              # TypeScript 타입 정의
└── utils/              # 유틸리티 함수
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 입력하세요:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Cloudflare R2 Configuration (나중에 이미지 업로드 시 사용)
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-r2-bucket-name
CLOUDFLARE_R2_ENDPOINT=your-r2-endpoint
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 다음 테이블들을 생성하세요:

#### `profiles` 테이블
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### `communities` 테이블
```sql
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  owner_id UUID REFERENCES auth.users(id),
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON communities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🎯 MVP 기능

- [x] 회원가입 / 로그인 (Supabase Auth)
- [x] 메인 페이지
- [ ] 커뮤니티 목록 / 생성 / 가입
- [ ] 커뮤니티별 게시판 (글 작성, 댓글 기능)
- [ ] 마이페이지 (내 글/댓글/포인트/레벨)
- [ ] 이미지 업로드 (Cloudflare R2)

## 🏗️ 다음 단계

1. Supabase 데이터베이스 테이블 생성
2. 커뮤니티 목록 및 생성 기능 구현
3. 게시판 기능 구현
4. 마이페이지 구현
5. 이미지 업로드 기능 추가

## 📝 환경 변수 얻는 방법

### Supabase
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택 → Settings → API
3. `Project URL`과 `anon public` 키 복사

### Cloudflare R2 (추후 이미지 업로드용)
1. Cloudflare Dashboard → R2 Object Storage
2. 버킷 생성 후 API 토큰 발급
