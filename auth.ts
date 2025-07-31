import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { AUTHOR_BY_GITHUB_ID_QUERY } from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
      GitHubProvider({
          clientId:     process.env.GITHUB_ID!,
          clientSecret: process.env.GITHUB_SECRET!,
      }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (!profile?.id || !profile.login) return false;

      const githubId = profile.id;
      const existingUser = await client.withConfig({ useCdn: false }).fetch(AUTHOR_BY_GITHUB_ID_QUERY, { id: githubId });


      if (!existingUser) {
        await writeClient.create({
          _type: "author",
          id: githubId,
          name: user.name!,
          username: profile.login,
          email: user.email,
          image: user.image!,
          bio: profile.bio ?? "",
        });
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile?.id) {
        const user = await client
            .withConfig({ useCdn: false })
            .fetch(AUTHOR_BY_GITHUB_ID_QUERY, {
              id: profile?.id,
            });

          if (user?._id) token.id = user._id;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user = session.user ?? {};
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
});