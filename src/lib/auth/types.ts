import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    operatorId?: string | null;
  }
  interface Session {
    user: User & {
      id: string;
      role: string;
    };
  }
}

// JWT augmentation handled via next-auth callbacks
