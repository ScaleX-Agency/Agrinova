export async function auth() {
  return {
    userId: "mock_admin_clerk_id",
    redirectToSignIn: () => {
      // noop
    },
  };
}

export async function clerkClient() {
  return {
    users: {
      createUser: async (data: any) => {
        return {
          id: `mock_user_clerk_id_${Math.random().toString(36).substring(7)}`,
        };
      },
      updateUser: async (id: string, data: any) => {
        return {};
      },
      getUser: async (id: string) => {
        return {
          id,
          firstName: "Mock",
          lastName: "User",
          emailAddresses: [{ id: "mock_email_id", emailAddress: "mock@agrinova.com" }],
        };
      },
      deleteUser: async (id: string) => {
        return {};
      },
    },
    emailAddresses: {
      updateEmailAddress: async (id: string, data: any) => {
        return { id };
      },
      createEmailAddress: async (data: any) => {
        return { id: "mock_email_id" };
      },
      deleteEmailAddress: async (id: string) => {
        return {};
      },
    },
  };
}
