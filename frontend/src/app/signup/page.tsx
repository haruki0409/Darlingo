import { AuthForm } from "@/components/AuthForm";
import { BrandHeader } from "@/components/BrandHeader";
import { FloatingChars } from "@/components/FloatingChars";
import { LangChips } from "@/components/LangChips";

export const metadata = {
  title: "회원가입 ・ 新規登録 | Darlingo",
};

export default function SignupPage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12">
      <FloatingChars />
      <main className="relative z-10 w-full max-w-md">
        <BrandHeader
          tagline="처음 만나는 두근거림"
          sub="이메일·비밀번호만으로 시작해요"
        />
        <AuthForm mode="signup" />
        <div className="mt-7">
          <LangChips />
        </div>
      </main>
    </div>
  );
}
