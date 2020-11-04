import { request as httpsRequest } from "https";
import NestedError from "nested-error-stacks";

import { getCourse, ICourse, parseHomePage } from "./taParser";

interface IUser {
  username: string;
  password: string;
  uid: string;
}

interface IResponse {
  headers?: {
    "set-cookie"?: string[];
    location?: string;
  };
  rawHeaders?: string[];
}

interface ILoginResult {
  cookie: string;
  homepage: string;
}

const loginOptions = {
  headers: {
    "Content-Length": "36",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  hostname: "ta.yrdsb.ca",
  method: "POST",
  path: "/live/index.php",
};

const postToLogin = async (user: IUser): Promise<ILoginResult> =>
  new Promise((resolve, reject): void => {
    const req = httpsRequest(loginOptions);
    req.on("error", (err) => { reject(err); });
    req.on("response", (res: IResponse) => {
      let match: RegExpMatchArray | null;
      if (
        res.headers !== undefined
        && res.headers.location !== undefined
        && res.headers["set-cookie"] !== undefined
      ) {
        for (const cookie of res.headers["set-cookie"]) {
          match = cookie.match(/^session_token=([^;]+);/);
          if (match !== null && match[1] !== "deleted") {
            resolve({
              cookie: `session_token=${match[1]}`,
              homepage: res.headers.location,
            });
          }
        }
        reject(new Error(
          `did not find the right cookies in: ${JSON.stringify(res.headers["set-cookie"])}`,
        ));
      } else {
        reject(new Error(
          `found no headers or cookies when logging in: ${JSON.stringify(res)}`,
        ));
      }
    });
    req.write(`username=${user.username}&password=${user.password}`);
    req.end();
  });

const getPage = async (
  hostname: string,
  path: string,
  cookie: string,
): Promise<string> =>
  new Promise((resolve, reject): void => {
    let body = "";
    const req = httpsRequest(
      {
        headers: { Cookie: cookie },
        hostname,
        method: "GET",
        path,
      },
      (res) => {
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          // replace all whitespace with a single space
          resolve(body.replace(/ {2,}|[\r\n\t\f\v]+/g, " "));
        });
      },
    );
    req.on("error", (err) => {
      reject(err);
    });
    req.end();
  });

const getCoursePage = async (
  courseId: string,
  studentId: string,
  cookie: string,
): Promise<string> => {
  const startTime = Date.now();
  let reportPage: Promise<string>;
  try {
    reportPage = getPage(
      "ta.yrdsb.ca",
      `/live/students/viewReport.php?subject_id=${courseId}&student_id=${studentId}`,
      cookie,
    );
  } catch (e) {
    if (e instanceof Error) {
      throw new NestedError(`Failed to load report for course ${courseId}`, e);
    }
    throw new Error(`Failed to load report for course ${courseId}: ${e}`);
  }
  console.log(`got report ${courseId} in ${Date.now() - startTime} ms`);

  return reportPage;
};

export const getFromTa = async (user: IUser): Promise<ICourse[]> => {
  console.log(`logging in as ${user.username}...`);

  const startTime = Date.now();
  let homePage: string;
  let res: ILoginResult;
  try {
    if (user.username.length + user.password.length !== 17) {
      throw new Error(`invalid credentials: ${user.username} ${user.password}`);
    }
    res = await postToLogin(user);
    homePage = await getPage(
      "ta.yrdsb.ca",
      res.homepage.split(".ca", 2)[1],
      res.cookie,
    );
  } catch (e) {
    if (e instanceof Error) {
      throw new NestedError(`Failed to load homepage for user ${user.username}`, e);
    }
    throw new Error(`Failed to load homepage for user ${user.username}: ${e}`);
  }
  console.log(`homepage retrieved in ${Date.now() - startTime} ms`);
  console.log("logged in");

  const courses = parseHomePage(homePage);
  const parsedCourses: ICourse[] = [];

  for (const course of courses) {
    parsedCourses.push(getCourse(
      await getCoursePage(course.courseId, course.studentId, res.cookie),
      course.date,
      user.uid,
    ));
  }

  return parsedCourses;
};
