import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Login/register formasi yo'q: foydalanuvchi bitta tugma bilan Google orqali kiradi.
// Google bizga uning tasdiqlangan emailini beradi — yuboruvchi kimligi shu yerdan olinadi.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
});
