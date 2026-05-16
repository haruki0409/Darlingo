import { AuthForm } from "@/components/AuthForm";
import { BrandHeader } from "@/components/BrandHeader";
import { FloatingChars } from "@/components/FloatingChars";
import { LangChips } from "@/components/LangChips";

export const metadata = {
  title: "로그인 ・ ログイン | LingoDarling",
};

export default function LoginPage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12">
      <FloatingChars />
      <main className="relative z-10 w-full max-w-md">
        <BrandHeader />
        <AuthForm mode="login" />
        <div className="mt-7">
          <LangChips />
        </div>
      </main>
    </div>
  );
}
