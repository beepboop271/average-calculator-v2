require("dotenv-safe").config();

import rp from "request-promise-native";
import { CookieJar } from "request";

const TA_LOGIN_URL: string = "https://ta.yrdsb.ca/yrdsb/index.php";
const TA_COURSE_BASE_URL: string = "https://ta.yrdsb.ca/live/students/viewReport.php";
const TA_ID_REGEX: RegExp = /<a href="viewReport.php\?subject_id=([0-9]+)&student_id=([0-9]+)">/;
const STRAND_PATTERNS: readonly RegExp[] = [
  /<td bgcolor="ffffaa" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
  /<td bgcolor="c0fea4" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
  /<td bgcolor="afafff" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
  /<td bgcolor="ffd490" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
  /<td bgcolor="#?dedede" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/
];

type StrandString = "k"|"t"|"c"|"a"|"f";

interface IAuthMap {
  username: string;
  password: string;
}

interface ITagMatch {
  content: string;
  next: string;
}

class Stranded<T> implements Iterable<[StrandString, T|null]> {
  public static readonly STRANDS: StrandString[] = ["k", "t", "c", "a", "f"];
  private static readonly strandSet: Set<StrandString> = new Set(Stranded.STRANDS);

  private data: Map<StrandString, T|null>;

  constructor(
    k: T|null = null,
    t: T|null = null,
    c: T|null = null,
    a: T|null = null,
    f: T|null = null
  ) {
    this.data = new Map<StrandString, T|null>([
      ["k", k],
      ["t", t],
      ["c", c],
      ["a", a],
      ["f", f]
    ]);
  }

  public [Symbol.iterator](): Iterator<[StrandString, T|null]> {
    let idx: number = 0;
    return {
      next: () => {
        if (idx < 5) {
          return {
            value: [
              Stranded.STRANDS[idx],
              this.data.get(Stranded.STRANDS[idx++])!
            ],
            done: false
          };
        } else {
          return { value: undefined, done: true };
        }
      }
    };
  }

  public get(strand: StrandString): T|null {
    return this.data.get(strand)!;
  }

  public set(strand: StrandString, element: T|null): void {
    this.data.set(strand, element);
  }
}

class Mark {
  private _numerator: number;
  private _denominator: number;
  private _weight: number;
  private _decimal: number;

  constructor(numerator: number, denominator: number, weight: number) {
    this._numerator = numerator;
    this._denominator = denominator;
    this._weight = weight;
    this._decimal = numerator/denominator;
  }

  public equals(other: Mark|null): boolean {
    return (
      other != null
      && this._numerator == other._numerator
      && this._denominator == other._denominator
      && this._weight == other._weight
    );
  }

  public toString(): string {
    return `Mark(W${this._weight} ${this._numerator}/${this._denominator} ${(this._decimal*100).toFixed(2)})`;
  }

  get weight() {
    return this._weight;
  }
  get numerator() {
    return this._numerator;
  }
  get denominator() {
    return this._denominator;
  }
}

class Assessment implements Iterable<[StrandString, Mark|null]> {
  private _name: string;
  private _marks: Stranded<Mark>;

  constructor(name: string, marks: readonly (Mark|null)[]|null = null) {
    this._name = name;

    if (marks != null) {
      this._marks = new Stranded<Mark>(...marks);
    } else {
      this._marks = new Stranded<Mark>();
    }
  }

  public equals(other: Assessment|null): boolean {
    if (other == null || this._name != other._name) {
      return false;
    }

    for (const [strand, mark] of this._marks) {
      if (mark == null) {
        if (other._marks.get(strand) != null) {
          return false;
        }
      } else if (!mark.equals(other._marks.get(strand))) {
        return false;
      }
    }

    return true;
  }

  public toString(): string {
    return `Assessment(${this._name}: K:${this._marks.get("k")} T:${this._marks.get("t")} C:${this._marks.get("c")} A:${this._marks.get("a")} F:${this._marks.get("f")})`;
  }

  public copyFrom(other: Assessment): void {
    for (const [strand, mark] of other._marks) {
      if (mark == null) {
        this._marks.set(strand, null);
      } else {
        this._marks.set(
          strand,
          new Mark(mark.numerator, mark.denominator, mark.weight)
        );
      }
    }
  }

  public getMark(strand: StrandString) {
    return this._marks.get(strand);
  }

  public [Symbol.iterator](): Iterator<[StrandString, Mark|null]> {
    return this._marks[Symbol.iterator]();
  }

  get name() {
    return this._name;
  }
}

class Strand {
  private _name: StrandString;
  private _weight: number;
  private _marks: Mark[];
  private _mark: number;
  private _isValid: boolean;

  constructor(strand: StrandString, weight: number) {
    this._name = strand;
    this._weight = weight;
    this._marks = [];
    this._mark = 1.0;
    this._isValid = false;
  }

  public equals(other: Strand|null): boolean {
    if (
      other == null
      || this._name != other._name
      || this._mark != other._mark
      || this._marks.length != other._marks.length
      || this._weight != other._weight
    ) {
      return false;
    }
    // rip O(n^2)
    for (const mark of this._marks) {
      if (!other.hasMark(mark)) {
        return false;
      }
    }
    return true;
  }

  public addMark(mark: Mark): void {
    this._marks.push(mark);
  }

  public hasMark(mark: Mark): boolean {
    for (const ownMark of this._marks) {
      if (ownMark.equals(mark)) {
        return true;
      }
    }
    return false;
  }

  public calculateMark(): void {
    let totalWeight: number = 0;
    let weightedSum: number = 0;

    for (const mark of this._marks) {
      totalWeight += mark.weight;
      weightedSum += (mark.numerator/mark.denominator)*mark.weight;
    }

    if (totalWeight == 0) {
      this._isValid = false;
      this._mark = 1.0;
    } else {
      this._isValid = true;
      this._mark = weightedSum/totalWeight;
    }
  }

  get isValid() {
    return this._isValid;
  }
  get mark() {
    return this._mark;
  }
  get weight() {
    return this._weight;
  }
}

class Course {
  public static readonly NOT_PRESENT: number = 1;
  public static readonly PRESENT_BUT_DIFFERENT: number = 2;
  public static readonly PRESENT: number = 3;

  private _name: string;
  private _assessments: Assessment[];
  private _mark: number;
  private _isValid: boolean;
  private _strands: Stranded<Strand>;

  constructor(
    name: string,
    weights: readonly number[] = [],
    assessmentList: readonly Assessment[]|null = null
  ) {
    this._name = name;
    this._assessments = [];
    this._mark = 1.0;
    this._isValid = false;

    if (weights.length == Stranded.STRANDS.length) {
      this._strands = new Stranded<Strand>(
        ...Stranded.STRANDS.map(
          (strand: StrandString, i: number): Strand => {
            return new Strand(strand, weights[i]);
          }
        )
      );
      assessmentList?.forEach(assessment => {
        this.addAssessment(assessment);
      });
    } else {
      this._strands = new Stranded<Strand>();
    }
  }

  public equals(other: Course|null): boolean {
    if (other == null || this._mark != other._mark) {
      return false;
    }

    for (const [strandStr, strand] of this._strands) {
      if (strand == null) {
        if (other._strands.get(strandStr) != null) {
          return false;
        }
      } else {
        if (!strand.equals(other._strands.get(strandStr))) {
          return false;
        }
      }
    }
    return true;
  }

  public generateReport(precision: number = 4): string {
    let s: string = `${this._name}\n\t`;

    for (const [strandStr, strand] of this._strands) {
      if (strand != null && strand.isValid) {
        s += `${strandStr} ${(strand.mark*100).toFixed(precision)} \t`;
      } else {
        s += `${strandStr} None \t`;
      }
    }

    if (this._isValid) {
      s += `\n\tavg ${(this._mark*100).toFixed(precision)}\n\tta shows ${(this._mark*100).toFixed(1)}\n`;
    } else {
      s += "\n\tavg None\n\tta shows None";
    }
    return s;
  }

  public addStrand(strand: StrandString, weight: number): void {
    this._strands.set(strand, new Strand(strand, weight));
  }

  public addAssessment(assessment: Assessment): void {
    this._assessments.push(assessment);
    for (const [strand, mark] of assessment) {
      if (mark != null) {
        if (this._strands.get(strand) != null) {
          this._strands.get(strand)!.addMark(mark);
        } else {
          throw new Error(`Tried to add to nonexistent strand ${strand} when adding ${assessment.toString()}`);
        }
      }
    }
  }

  public hasAssessment(assessment: Assessment): number|Assessment {
    for (const ownAssessment of this._assessments) {
      if (ownAssessment.equals(assessment)) {
        return Course.PRESENT;
      } else if (ownAssessment.name == assessment.name) {
        return ownAssessment;
      }
    }
    return Course.NOT_PRESENT;
  }

  public removeAssessment(index: number): void {
    this._assessments.splice(index, 1);
  }

  public calculateMark(): void {
    let totalWeight: number = 0;
    let weightedSum: number = 0;

    for (const [strandStr, strand] of this._strands) {
      if (strand != null) {
        strand.calculateMark();
        if (strand.isValid) {
          totalWeight += strand.weight;
          weightedSum += strand.mark*strand.weight;
        }
      }
    }

    if (totalWeight == 0) {
      this._isValid = false;
      this._mark = 1.0;
    } else {
      this._isValid = true;
      this._mark = weightedSum/totalWeight;
    }
  }

  get assessments() {
    return this._assessments;
  }
  get name() {
    return this._name;
  }
}

function mergeFromInto(taCourse: Course, localCourse: Course): void {
  if (taCourse.equals(localCourse)) {
    return;
  }

  let status: number|Assessment;
  for (const taAssessment of taCourse.assessments) {
    status = localCourse.hasAssessment(taAssessment);
    // Course.PRESENT: do nothing
    if (status == Course.NOT_PRESENT) {
      localCourse.addAssessment(taAssessment);
      console.log(`added ${taAssessment.name} to ${localCourse.name}`);
    } else if (typeof status != "number") {
      // Course.PRESENT_BUT_DIFFERENT
      (<Assessment>status).copyFrom(taAssessment);
      console.log(`updated ${taAssessment.name}`);
    }
  }

  for (let i: number = 0, len: number = localCourse.assessments.length; i < len; ++i) {
    status = taCourse.hasAssessment(localCourse.assessments[i]);
    if (status == Course.NOT_PRESENT) {
      console.log(`removed ${localCourse.assessments[i].name}`);
      localCourse.removeAssessment(i);
    }
  }
}

function mergeCourseLists(
  taCourses: readonly Course[],
  localCourses: Course[]
): void {
  const taMap = new Map<string, Course>();
  const localMap = new Map<string, Course>();

  for (const course of taCourses) {
    taMap.set(course.name, course);
  }
  for (const course of localCourses) {
    localMap.set(course.name, course);
  }

  const taNames: Set<string> = new Set<string>(
    taCourses.map((course: Course): string => course.name)
  );
  const localNames: Set<string> = new Set<string>(
    localCourses.map((course: Course): string => course.name)
  );

  for (const name of taNames) {
    if (!localNames.has(name)) {
      console.log(`added ${name} to local courses`);
      localCourses.push(taMap.get(name)!);
    }
  }

  for (const name of localNames) {
    if (taNames.has(name)) {
      mergeFromInto(taMap.get(name)!, localMap.get(name)!);
    }
  }
}

async function getFromTa(auth: IAuthMap): Promise<Course[]> {
  console.log("logging in...");
  const session: CookieJar = rp.jar();

  const homePage: string = await rp.post({
    url: TA_LOGIN_URL,
    jar: session,
    form: auth,
    followAllRedirects: true,
    timeout: Number(process.env.TIMEOUT)
  });

  if (/Invalid Login/.test(homePage)) {
    throw new Error(`Invalid login: ${auth}`);
  }

  const idMatcher: RegExp = new RegExp(TA_ID_REGEX, "g");

  let courseIDs: RegExpMatchArray|null = idMatcher.exec(homePage);
  
  if (!courseIDs) {
    throw new Error("No open reports found");
  }

  console.log("logged in");
  const courses: Course[] = [];

  let report: string;
  let name: string|null;
  let weights: number[]|null;
  let assessments: Assessment[]|null;

  while (courseIDs) {
    console.log(`getting ${courseIDs[1]}...`);
    report = await rp.get({
      url: TA_COURSE_BASE_URL,
      jar: session,
      qs: { subject_id: courseIDs[1], student_id: courseIDs[2] },
      followAllRedirects: false,
      timeout: Number(process.env.TIMEOUT)
    });
    console.log("got report");

    report = report.replace(/\s+/g, " ");

    try {
      name = getName(report);
      if (name == null)
        throw new Error(`Course name not found:\n${report}`);

      weights = getWeights(report);
      if (weights == null)
        throw new Error(`Course weights not found:\n${report}`);

      assessments = getAssessments(report);
      if (assessments == null)
        throw new Error(`Course assessments not found:\n${report}`);

      courses.push(new Course(name, weights, assessments));
    } catch (e) {
      // even if one course fails, we want to
      // continue grabbing the other courses
      console.log(e);
    }
    courseIDs = idMatcher.exec(homePage);
  }
  return courses;
}

function getName(report: string): string|null {
  const match: RegExpExecArray|null = /<h2>(\S+?)<\/h2>/.exec(report);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}

function getWeights(report: string): number[]|null {
  const idx: number = report.indexOf("#ffffaa");
  if (idx == -1) {
    return null;
  }
  report = report.slice(idx, idx+800);

  const weightTable: string[] = report.split("#");
  weightTable.shift();

  const weights: number[] = [];
  let match: RegExpMatchArray|null;

  for (let i: number = 0; i < 4; ++i) {
    match = weightTable[i].substring(weightTable[i].indexOf("%")).match(/([0-9\.]+)%/);
    if (match == null) {
      throw new Error(`Found weight table but couldn't find weight percentages in:\n${weightTable[i]}`);
    }
    weights.push(Number(match[1]));
  }

  match = weightTable[5]?.match(/([0-9\.]+)%/);
  if (match == null) {
    throw new Error(`Could not find final weight in:\n${weightTable}`);
  }
  weights.push(Number(match[1]));

  return weights;
}

function getAssessments(report: string): Assessment[]|null {
  const assessmentTable: ITagMatch|null = getEndTag(
    report,
    /table border="1" cellpadding="3" cellspacing="0" width="100%">/,
    /(<table)|(<\/table>)/,
    "<table"
  );
  if (assessmentTable == null) {
    return null;
  }

  report = assessmentTable.content.replace(
    /<tr> <td colspan="[0-5]" bgcolor="white"> [^&]*&nbsp; <\/td> <\/tr>/g,
    ""
  );

  let row: ITagMatch|null;
  const rows: string[] = [];
  const tablePattern: RegExp = /<tr>.+<\/tr>/;
  while (tablePattern.test(report)) {
    row = getEndTag(report, /<tr>/, /(<tr>)|(<\/tr>)/, "<tr>");
    if (row == null) {
      throw new Error(`Expected to find an assessment but none was found in:\n${report}`);
    }
    rows.push(row.content);
    report = row.next;
  }
  rows.shift();

  const assessments: Assessment[] = [];

  const namePattern: RegExp = /<td rowspan="2">(.+?)<\/td>/;
  let name: string;
  let match: RegExpExecArray|null;
  let marks: (Mark|null)[];

  for (const row of rows) {
    marks = [];

    match = namePattern.exec(row);
    if (match == null) {
      throw new Error(`Could not find assessment name in row:\n${row}`);
    }
    name = match[1].trim();

    for (const pattern of STRAND_PATTERNS) {
      match = pattern.exec(row);
      if (match == null) {
        marks.push(null);
      } else {
        marks.push(new Mark(Number(match[1]), Number(match[2]), Number(match[3])))
      }
    }

    assessments.push(new Assessment(name, marks));
  }
  return assessments;
}

function getEndTag(
  report: string,
  beginningPattern: RegExp,
  searchPattern: RegExp,
  startTag: string
): ITagMatch|null {
  let match: RegExpMatchArray|null = report.match(beginningPattern);
  if (match == null) {
    return null;
  }
  const idx: number = match.index!;

  let tagsToClose: number = 1;
  const searcher: RegExp = new RegExp(searchPattern, "g");

  while (tagsToClose > 0) {
    match = searcher.exec(report.substring(idx+1));
    if (match == null) {
      return null;
    }
    if (match[0] == startTag) {
      ++tagsToClose;
    } else {
      --tagsToClose;
    }
  }

  return {
    content: report.slice(idx-1, idx+match.index!+1+match[0].length),
    next: report.substring(idx+match.index!+1+match[0].length)
  };
}

getFromTa({
  username: process.env.STUDENT_ID!,
  password: process.env.PASS!
}).then((courses: Course[]) => {
  for (const course of courses) {
    course.calculateMark();
    console.log(course.generateReport());
  }
}).catch(e => console.log(e));
