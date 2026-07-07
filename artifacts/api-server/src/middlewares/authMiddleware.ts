import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

const LOCAL_USER_ID = process.env.LOCAL_USER_ID ?? "local-user";

const localUserSeed: AuthUser = {
  id: LOCAL_USER_ID,
  email: null,
  firstName: "Local",
  lastName: "User",
  profileImageUrl: null,
};

let localUserPromise: Promise<AuthUser> | null = null;

async function getLocalUser(): Promise<AuthUser> {
  if (!localUserPromise) {
    localUserPromise = (async () => {
      const [user] = await db
        .insert(usersTable)
        .values(localUserSeed)
        .onConflictDoUpdate({
          target: usersTable.id,
          set: {
            ...localUserSeed,
            updatedAt: new Date(),
          },
        })
        .returning();

      return (
        user && {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        }
      ) ?? localUserSeed;
    })();
  }

  return localUserPromise;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  req.user = await getLocalUser();
  next();
}
