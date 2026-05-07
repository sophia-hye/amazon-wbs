import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
    })
  : null

export const SUPABASE_SETUP_MESSAGE =
  'Supabase 환경변수가 설정되지 않았습니다. 프로젝트 루트에 .env.local 파일을 만들고 ' +
  'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 입력한 뒤 dev 서버를 재시작하세요. ' +
  '자세한 절차는 README의 "Supabase 설정" 섹션을 참고하세요.'
