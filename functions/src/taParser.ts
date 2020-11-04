import * as crypto from "crypto";

const getCombinedHash = (...strings: string[]): string =>
  crypto
    .createHash("sha256")
    .update(strings.reduce((acc, cur): string => acc + cur, ""))
    .digest("base64")
    .replace(/=*$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

// types

type StrandString = "k" | "t" | "c" | "a" | "f";

export interface IMark {
  strand: StrandString;
  uid: string;
  taId: string;
  name: string;
  hash: string;

  weight: number;
  numerator: number;
  denominator: number;
}

export interface ICourse {
  name: string;
  date: string;
  hash: string;

  weights: number[] | undefined;
  assessments: IMark[] | undefined;
}

// generic basic html/regex extraction

interface ITagMatch {
  after: string;
  content: string;
}

const getEndTag = (
  report: string,
  beginningPattern: RegExp,
  searchPattern: RegExp,
  startTag: string,
): ITagMatch | undefined => {
  let match = report.match(beginningPattern);
  if (match === null || match.index === undefined) {
    return undefined;
  }
  const idx = match.index;

  let tagsToClose = 1;
  const searcher = new RegExp(searchPattern, "g");

  while (tagsToClose > 0) {
    match = searcher.exec(report.substring(idx + 1));
    if (match === null || match.index === undefined) {
      return undefined;
    }
    if (match[0] === startTag) {
      ++tagsToClose;
    } else {
      --tagsToClose;
    }
  }

  return {
    after: report.substring(idx + match.index + 1 + match[0].length),
    content: report.slice(idx - 1, idx + match.index + 1 + match[0].length),
  };
};

const getElementList = (
  report: string,
  beginningPattern: RegExp,
  searchPattern: RegExp,
  startTag: string,
  moreElementsTestPattern: RegExp,
): string[] => {
  const elements: string[] = [];
  let tagMatch: ITagMatch | undefined;
  let leftover = report;
  while (moreElementsTestPattern.test(leftover)) {
    tagMatch = getEndTag(leftover, beginningPattern, searchPattern, startTag);
    if (tagMatch === undefined) {
      throw new Error(`Expected to find more elements with ${moreElementsTestPattern.toString()} but none was found in:\n${report}`);
    }
    elements.push(tagMatch.content);
    leftover = tagMatch.after;
  }

  return elements;
};

const matchAll = (str: string, pattern: RegExp): RegExpExecArray[] => {
  const matcher = new RegExp(pattern, "g");
  const matches: RegExpExecArray[] = [];
  let lastMatch: RegExpExecArray | null;

  lastMatch = matcher.exec(str);
  while (lastMatch !== null) {
    matches.push(lastMatch);
    lastMatch = matcher.exec(str);
  }

  return matches;
};

// ta-specific extraction

const getName = (report: string): string | undefined => {
  const match = report.match(/<h2>(\S+?)<\/h2>/);

  return match !== null ? match[1] : undefined;
};

const getWeights = (report: string): number[] | undefined => {
  const idx = report.indexOf("#ffffaa");
  if (idx === -1) {
    return undefined;
  }

  const weightTable = report.slice(idx, idx + 800).split("#");
  weightTable.shift();

  const weights: number[] = [];
  let match: RegExpMatchArray | null;

  for (let i = 0; i < 4; ++i) {
    match = weightTable[i]
      .substring(weightTable[i].indexOf("%"))
      .match(/([0-9\.]+)%/);
    if (match === null) {
      throw new Error(`Found weight table but couldn't find weight percentages in:\n${weightTable[i]}`);
    }
    weights.push(Number(match[1]));
  }

  match = weightTable[5]?.match(/([0-9\.]+)%/);
  if (match === null) {
    throw new Error(`Could not find final weight in:\n${weightTable.toString()}`);
  }
  weights.push(Number(match[1]));

  return weights;
};

const namePattern = /<td rowspan="2">(.+?)<\/td>/;
const colourPattern = /<td bgcolor="([#0-9a-f]+)"/;
const markPattern = /align="center" id="e,(?<id>\d+)">(?:no mark|(?<numerator>\d+(?:\.\d+)?)? \/ (?<denominator>\d+(?:\.\d+)?)[^<]+<br> <font size="-2">(?:no weight|weight=(?<weight>\d+(?:\.\d+)?))<\/font>)/;
const strandsFromColour: Map<string, StrandString> = new Map([
  ["ffffaa", "k"],
  ["c0fea4", "t"],
  ["afafff", "c"],
  ["ffd490", "a"],
  ["#dedede", "f"],
]);
const tableRowPattern = /<tr>.+<\/tr>/;
const tableDataPattern = /<td.+<\/td>/;

const getMarksFromRow = (
  uid: string,
  tableRow: string,
): IMark[] => {
  const parts = getElementList(
    tableRow,
    /<td/,
    /(<td)|(<\/td>)/,
    "<td",
    tableDataPattern,
  );

  if (parts.length === 0) {
    throw new Error(`Found no data in row:\n${tableRow}`);
  }
  const nameMatch = parts.shift()?.match(namePattern);
  if (nameMatch === null || nameMatch === undefined) {
    throw new Error(`Could not find assessment name in row:\n${tableRow}`);
  }
  const rowName = nameMatch[1].trim();

  const marks: IMark[] = [];

  let colourMatch: RegExpMatchArray | null;
  let strand: StrandString | undefined;
  let markMatches: RegExpExecArray[];
  for (const part of parts) {
    colourMatch = part.match(colourPattern);
    if (colourMatch === null) {
      throw new Error(`Found no strand colour in part:\n${part}\nin row:\n${tableRow}`);
    }
    strand = strandsFromColour.get(colourMatch[1]);
    if (strand === undefined) {
      throw new Error(`Found no matching strand for colour ${colourMatch[1]} in row:\n${tableRow}`);
    }

    markMatches = matchAll(part, markPattern);
    for (const markMatch of markMatches) {
      if (markMatch.groups !== undefined) {
        marks.push({
          strand,
          uid,
          taId: markMatch.groups.id,
          name: rowName,
          hash: getCombinedHash(
            strand,
            uid,
            markMatch.groups.id,
            rowName,
            markMatch.groups.weight,
            markMatch.groups.numerator,
            markMatch.groups.denominator,
          ),

          // tslint:disable:strict-boolean-expressions
          weight: Number(markMatch.groups.weight) || 0,
          numerator: Number(markMatch.groups.numerator) || 0,
          denominator: Number(markMatch.groups.denominator) || 0,
          // tslint:enable
        });
      }
    }
  }

  return marks;
};

const getMarksFromReport = (
  uid: string,
  report: string,
): IMark[] | undefined => {
  const assessmentTableMatch = getEndTag(
    report,
    /table border="1" cellpadding="3" cellspacing="0" width="100%">/,
    /(<table)|(<\/table>)/,
    "<table",
  );
  if (assessmentTableMatch === undefined) {
    return undefined;
  }

  const rows = getElementList(
    assessmentTableMatch.content.replace(
      /<tr> <td colspan="[0-5]" bgcolor="white"> [^&]*&nbsp; <\/td> <\/tr>/g,
      "",
    ),
    /<tr>/,
    /(<tr>)|(<\/tr>)/,
    "<tr>",
    tableRowPattern,
  );
  rows.shift();

  const marks: IMark[] = [];

  for (const row of rows) {
    marks.push(...getMarksFromRow(uid, row));
  }

  return marks;
};

export const getCourse = (
  reportPage: string,
  date: string,
  uid: string,
): ICourse => {
  let name: string | undefined;
  let weights: number[] | undefined;
  let assessments: IMark[] | undefined;

  try {
    name = getName(reportPage);
    if (name === undefined) {
      throw new Error(`Course name not found:\n${reportPage}`);
    }

    weights = getWeights(reportPage);
    if (weights === undefined) {
      console.warn(`Course weights not found:\n${reportPage}`);
    }

    assessments = getMarksFromReport(uid, reportPage);
    if (assessments === undefined) {
      console.warn(`Course assessments not found:\n${reportPage}`);
    }

    return {
      name,
      date,
      hash: getCombinedHash(name, date),
      weights,
      assessments,
    };
  } catch (e) {
    throw e;
  }
};

const idMatcher = /<a href="viewReport.php\?subject_id=([0-9]+)&student_id=([0-9]+)">/;
const dateMatcher = /(\d\d\d\d-\d\d)-\d\d/;

interface IHomepageCourseInfo {
  courseId: string;
  studentId: string;
  date: string;
}

export const parseHomePage = (homePage: string): IHomepageCourseInfo[] => {
  let courseRows = getEndTag(
    homePage,
    /<tr bgcolor="#(?:dd|ee)ffff">/,
    /(<tr)|(<\/tr>)/,
    "<tr",
  );
  if (courseRows === undefined) {
    throw new Error(`No open reports found:\n${homePage}`);
  }

  const courses: IHomepageCourseInfo[] = [];

  while (courseRows !== undefined) {
    const id = courseRows.content.match(idMatcher);
    const date = courseRows.content.match(dateMatcher);
    if (date === null) {
      console.warn(`empty homepage row: ${courseRows.content}`);
    } else if (id === null) {
      console.warn(`course closed: ${courseRows.content}`);
    } else {
      courses.push({
        courseId: id[1],
        studentId: id[2],
        date: date[1],
      });
    }

    courseRows = getEndTag(
      courseRows.after,
      /<tr bgcolor="#(?:dd|ee)ffff">/,
      /(<tr)|(<\/tr>)/,
      "<tr",
    );
  }

  return courses;
};
