// Formato bruto de GET https://apiv2.inteli.edu.br/sections/{uuid}/userdata
//
// Só os campos que realmente consumimos estão tipados; o resto do payload é
// ignorado de propósito, para que um campo novo do lado deles não quebre nada.

/** 1 = A fazer, 2 = Fazendo, 3 = Feito. Confirmado no bundle do Adalove. */
export type ActivityStatus = 1 | 2 | 3;

export const STATUS_TODO = 1 satisfies ActivityStatus;
export const STATUS_DOING = 2 satisfies ActivityStatus;
export const STATUS_DONE = 3 satisfies ActivityStatus;

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  1: "A fazer",
  2: "Fazendo",
  3: "Feito",
};

export interface RawActivity {
  studentActivityUuid: string;
  activityUuid: string;
  studentUuid: string;
  sectionUuid: string;

  caption: string;
  description: string | null;
  status: ActivityStatus;
  sort: number;

  /** Código numérico do tipo. Ambíguo (11 cobre material e atividade avaliada),
   *  por isso a classificação real usa o caption — igual ao parser do site. */
  type: number | null;
  study_type: string | null;
  in_class_activity: number | null;
  exam: number | null;
  required: number | null;
  favorite: number | null;

  /** Peso na nota, escala limpa (Artefato = 4). "0" quando não vale nota. */
  gradeWeight: number | null;
  /** "-1.0" = ainda não avaliado. */
  gradeResult: string | null;
  evaluated: number | null;
  activityFeedback: string | null;
  activityFeedbackGroup: string | null;
  /** Enunciado e resposta da aba "Avaliação". */
  studyQuestion: string | null;
  studyAnswer: string | null;
  assistantProfessorName: string | null;
  activityNotes: string | null;
  activityPositivePoints: string | null;
  activityNegativePoints: string | null;
  activityRating: number | null;

  /** "Semana 06" — o agrupamento do kanban. */
  folderCaption: string | null;
  folder: string | null;

  date: string | null;
  professorName: string | null;
  axisCaption: string | null;
  activityTags: string | null;
  basicActivityURL: string | null;

  attendance1: number | null;
  attendance2: number | null;
  attendance3: number | null;
  absenceAllowanceType: number | null;
  absenceAllowanceTypeName: string | null;
  /** Abono: a chamada abonada (1/2/3) e a papelada que comprova. Nulos quando
   *  não há abono — é o que separa falta de falta justificada. */
  absencePeriod?: string | number | null;
  absenceAllowanceUuid?: string | null;
  absenceAllowanceReason?: string | null;
  ticketNumber?: string | number | null;
}

export interface RawStudent {
  uuid: string;
  name: string;
  active: number | null;
  groupCaption: string | null;
  groupUuid: string | null;
  avatar_filename: string | null;
}

export interface RawSection {
  /** Mesma chave que o `uuid` de `GET /sections` — é por ela que o seletor de
   *  turmas sabe qual linha está aberta. */
  sectionUuid?: string | null;
  sectionCaption: string | null;
  sectionType: string | null;
  sectionAcademicYear: string | null;
  /** Horas-aula por chamada. 3º ano = 1 / 1 / 2. */
  sectionHoursOne: number | null;
  sectionHoursTwo: number | null;
  sectionHoursThree: number | null;
  /** Horário nominal de cada chamada ("07:52:00") e a tolerância em minutos. */
  sectionAttendanceTimeOne?: string | null;
  sectionAttendanceTimeTwo?: string | null;
  sectionAttendanceTimeThree?: string | null;
  sectionToleranceOne?: number | null;
  sectionToleranceTwo?: number | null;
  sectionToleranceThree?: number | null;
  advisorName?: string | null;
  projectCaption?: string | null;
  startDate?: string | null;
  [key: string]: unknown;
}

export interface RawStudentStatus {
  absencesCount: number | null;
  absencesPercentage: string | null;
  evaluationResult: string | null;
  doneEvaluationResult: string | null;
  [key: string]: unknown;
}

export interface RawGroup {
  groupCaption: string | null;
  groupUuid: string | null;
  groupImage: string | null;
}

export interface RawUserdata {
  section: RawSection;
  students: RawStudent[];
  activities: RawActivity[];
  studentStatus?: RawStudentStatus;
  group?: RawGroup;
  roles?: Record<string, string>;
}
