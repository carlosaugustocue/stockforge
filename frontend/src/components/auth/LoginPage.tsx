import LoginLeft from "./LoginLeft";
import LoginRight from "./LoginRight";

export default function LoginPage() {
  return (
    <main className="relative w-full h-screen flex overflow-hidden">
      <LoginLeft />
      <LoginRight />
    </main>
  );
}
