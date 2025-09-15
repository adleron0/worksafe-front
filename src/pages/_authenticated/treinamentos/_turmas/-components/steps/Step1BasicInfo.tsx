import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpCircle } from "lucide-react";
import DropUpload from "@/components/general-components/DropUpload";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { FormData } from "../TurmasFormSteps";
import { Response } from "@/general-interfaces/api.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { IEntity as Course } from "../../../_cursos/-interfaces/entity.interface";
import FaqGenerator from "@/components/general-components/FaqGenerator";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  setErrors?: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const Step1BasicInfo = ({ dataForm, setDataForm, errors }: StepProps) => {
  const [preview, setPreview] = useState<string | null>("");

  useEffect(() => {
    if (dataForm.imageUrl) {
      setPreview(dataForm.imageUrl);
    }
  }, [dataForm.imageUrl]);

  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  // Buscas de valores para variáveis de formulário
  const { data: courses, isLoading: isLoadingCourses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listCursos`],
    queryFn: async () => {
      const params = [
        { key: "limit", value: 'all' },
        { key: "active", value: true },
        { key: "order-name", value: "asc" },
      ];
      return get("courses", "", params);
    },
  });

  const { data: certificates, isLoading: isLoadingCertificates } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listCertificates`, dataForm.courseId],
    queryFn: async () => {
      const params = [
        { key: "active", value: true },
        { key: "courseId", value: dataForm.courseId },
        { key: "limit", value: 'all' },
        { key: "order-name", value: "asc" },
      ];
      return get("certificate", "", params);
    },
    enabled: dataForm.courseId > 0,
  });

  const { data: onlineCourses, isLoading: isLoadingOnlineCourses } = useQuery<
    Response | undefined,
    ApiError
  >({
    queryKey: [`listOnlineCourses`, dataForm.courseId],
    queryFn: async () => {
      const params = [
        { key: "courseId", value: dataForm.courseId },
        { key: "limit", value: 'all' },
        { key: "order-name", value: "asc" },
      ];
      return get("online-courses", "", params);
    },
    enabled: dataForm.hasOnlineCourse && dataForm.courseId > 0,
  });

  // Função para encontrar um curso pelo ID
  const findCourseById = (id: number) => {
    if (!courses) return null;
    return courses?.rows?.find((course) => course.id === id);
  };

  // Função genérica para atualizar um campo do formulário com base em outro valor
  const updateFormField = <T,>(
    fieldToUpdate: keyof FormData,
    valueGetter: (
      selectedName: string,
      selectedValue: string | string[],
    ) => T | undefined,
  ) => {
    return (selectedName: string, selectedValue: string | string[]) => {
      const newValue = valueGetter(selectedName, selectedValue);
      if (newValue !== undefined && dataForm[fieldToUpdate] !== newValue) {
        setDataForm((prev) => ({ ...prev, [fieldToUpdate]: newValue }));
      }
    };
  };

  // Helper para atualizar campos com base em propriedades do curso
  const updateFromCourse = <T extends keyof FormData>(
    field: T,
    propertyGetter: (course: Course) => FormData[T] | undefined,
  ) =>
    updateFormField(field, (_, value) => {
      const courseId = typeof value === "string" ? parseInt(value, 10) : null;
      if (courseId === null) return undefined;

      const course = findCourseById(courseId) as Course | null;
      return course ? propertyGetter(course) : undefined;
    });

  return (
    <div className="space-y-6">
      {/* Upload de Imagem */}
      <div className="h-60 w-full md:w-60">
        <DropUpload setImage={setDataForm} EditPreview={preview} />
      </div>

      {/* Turma Aberta */}
      <div className="p-4 bg-muted/30 border border-border/50 rounded-lg flex justify-between items-center">
        <div className="flex flex-col">
          <Label
            htmlFor="openClass"
            className="cursor-pointer flex items-center gap-2"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Turma aberta
          </Label>
          <p className="text-xs text-muted-foreground font-medium">
            Aparecer no site e na landingPage
          </p>
        </div>
        <Switch
          id="openClass"
          name="openClass"
          checked={dataForm.openClass ? true : false}
          onCheckedChange={() =>
            setDataForm((prev) => ({ ...prev, openClass: !prev.openClass }))
          }
        />
      </div>

      {/* Seleção de Curso */}
      <div>
        <Label htmlFor="courseId">
          Curso<span className="text-red-500">*</span>
        </Label>
        <Select
          name="courseId"
          disabled={isLoadingCourses}
          options={courses?.rows || []}
          onChange={(name, value) => handleChange(name, +value)}
          state={dataForm.courseId ? String(dataForm.courseId) : ""}
          placeholder="Selecione o curso"
          callBacks={[
            updateFromCourse("name", (course) => course.name),
            updateFromCourse("hoursDuration", (course) => course.hoursDuration),
            updateFromCourse("description", (course) => course.description),
            updateFromCourse("gradeTheory", (course) => course.gradeTheory),
            updateFromCourse(
              "gradePracticle",
              (course) => course.gradePracticle,
            ),
            updateFromCourse("faq", (course) =>
              FaqGenerator.parseFaqString(course.faq),
            ),
          ]}
        />
        {errors.courseId && (
          <p className="text-red-500 text-sm mt-1">{errors.courseId}</p>
        )}
      </div>

      {/* Seleção de Certificado */}
      <div>
        <Label htmlFor="certificateId">Certificado</Label>
        <Select
          name="certificateId"
          disabled={!dataForm.courseId || isLoadingCertificates}
          options={certificates?.rows || []}
          onChange={(name, value) => handleChange(name, value ? +value : null)}
          state={dataForm.certificateId ? String(dataForm.certificateId) : ""}
          placeholder={
            !dataForm.courseId
              ? "Selecione um curso primeiro"
              : "Selecione o certificado"
          }
        />
        {errors.certificateId && (
          <p className="text-red-500 text-sm mt-1">{errors.certificateId}</p>
        )}
      </div>

      {/* Curso Online */}
      <div className={`p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.hasOnlineCourse ? "pb-4" : ""}`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Label
              htmlFor="hasOnlineCourse"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Curso Online
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Vincula um modelo de curso online à esta turma
            </p>
          </div>
          <Switch
            id="hasOnlineCourse"
            name="hasOnlineCourse"
            checked={dataForm.hasOnlineCourse ? true : false}
            onCheckedChange={() =>
              setDataForm((prev) => ({
                ...prev,
                hasOnlineCourse: !prev.hasOnlineCourse,
                onlineCourseModelId: !prev.hasOnlineCourse ? prev.onlineCourseModelId : null,
              }))
            }
          />
        </div>

        {dataForm.hasOnlineCourse && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Label htmlFor="onlineCourseModelId">
              Modelo de Curso Online <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Selecione o modelo de curso online para esta turma
            </p>
            <Select
              name="onlineCourseModelId"
              disabled={!dataForm.courseId || isLoadingOnlineCourses}
              options={onlineCourses?.rows || []}
              onChange={(name, value) => handleChange(name, value ? +value : null)}
              state={dataForm.onlineCourseModelId ? String(dataForm.onlineCourseModelId) : ""}
              placeholder={
                !dataForm.courseId
                  ? "Selecione um curso primeiro"
                  : isLoadingOnlineCourses
                  ? "Carregando modelos..."
                  : "Selecione o modelo de curso online"
              }
            />
            {errors.onlineCourseModelId && (
              <p className="text-red-500 text-sm mt-1">{errors.onlineCourseModelId}</p>
            )}
          </div>
        )}
      </div>

      {/* Nome da Turma */}
      <div>
        <Label htmlFor="name">
          Nome da Turma <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Digite nome da turma"
          value={dataForm.name}
          onValueChange={handleChange}
          className="mt-1"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>
    </div>
  );
};

export default Step1BasicInfo;