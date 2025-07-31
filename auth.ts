import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";
import { AUTHOR_BY_GITHUB_ID_QUERY } from "@/sanity/lib/queries";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (!profile?.id || !profile.login || !user.email) return false;

      const providerId = profile.id;
      const authorId = `github_${providerId}`;
      
      await writeClient.createIfNotExists({
        _id: authorId,
        _type: "author",
        id: authorId,
        name: user.name ?? "",
        username: profile.login,
        email: user.email ?? "",
        image: user.image ?? "",
        bio: profile.bio ?? "",
      });

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile?.id) {
        const author = await client
          .withConfig({ useCdn: false })
          .fetch(AUTHOR_BY_GITHUB_ID_QUERY, { id: profile.id });

        if (author?._id) token.id = author._id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user = session.user ?? { name: null, email: null, image: null };
        session.user.id = token.id; // now reliably available
      }
      return session;
    },
  },
});