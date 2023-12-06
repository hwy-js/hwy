import { type DataProps } from "hwy";
import { getFormStrings } from "@hwy-js/utils";

export async function action({ c }: DataProps) {
  const data = await getFormStrings<"email" | "password">({ c });

  if (!data) {
    throw new Error("No data was returned from getFormStrings.");
  }

  if (!data.email || !data.password) {
    return {
      error: true,
      message: "Error: Please enter a valid email and password.",
    };
  }

  if (!data.email.includes(".") || !data.email.includes("@")) {
    return {
      error: true,
      message: "Error: Please enter a valid email address.",
    };
  }

  if (data.password.length < 4) {
    return {
      error: true,
      message: "Error: Please enter a password that is at least 4 characters.",
    };
  }

  return {
    email: "",
    success: true,
    message: `Congrats! You are signed in as ${data.email}.`,
  };
}

export type ActionType = typeof action;
