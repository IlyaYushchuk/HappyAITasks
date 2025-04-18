"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import React from "react";
import useSettingsStore from "~/stores/useSettingsStore";

const criteriaData = [
  {
    category: "Факторы создания позитивного впечатления",
    criteria: [
      "Доброжелательный тон (улыбка, доброжелательная интонация, спокойный и уверенный голос)",
      "Продавец фиксирует и выполняет достигнутые с клиентом договоренности (например, перезванивает, если обещал)",
    ],
  },
  {
    category: "Установление контакта",
    criteria: [
      "Продавец поприветствовал клиента, представился / ответил на приветствие клиента представился",
      "Продавец поблагодарил / просил прощения (в зависимости от ситуации) Клиента за ожидание",
      "Продавец в процессе диалога с клиентом использует техники активного слушания (уточнение, резюмирование)",
    ],
  },
  {
    category: "Выяснение потребностей клиента",
    criteria: [
      "Продавец задал вопросы на выяснение ситуации",
      "Продавец задал вопросы на выяснение потребности клиента",
      "Продавец подытожил полученную от клиента информацию и убедился в том, что правильно понял клиента",
    ],
  },
  {
    category: "Презентация",
    criteria: [
      "Специалист привлек внимание клиента (при необходимости, если клиент уходит от предмета разговора, пытается повесить трубку)",
      "Работа на увеличение среднего чека. (Специалист провел презентацию товара на языке выгод)",
      "Специалист побудил клиента к действию",
    ],
  },
  {
    category: "Работа с возражениями клиента",
    criteria: [
      "Специалист выслушал клиента, не перебивая",
      "Специалист присоединился к мнению клиента",
      "Специалист задал уточняющие вопросы (понял истинное возражение)",
      "Специалист привел аргумент",
      "Специалист убедился, что возражение нейтрализовано, ведет продажу далее",
      "Специалист побудил клиента к покупке",
      "Реакция сотрудника на возражения (спокойно, позитивно, агрессивно, пассивно и т.п. реагирует на возражения)",
    ],
  },
  {
    category: "Завершение контакта",
    criteria: [
      "Специалист подвел итог",
      "Искренне похвалил выбор клиента",
      "Специалист осуществил допродажу",
      "Специалист попрощался с клиентом",
    ],
  },
];

export default function CriteriaTable() {
  const { scoreArray } = useSettingsStore();

  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80%]">Критерии</TableHead>
            <TableHead className="w-[20%] text-center">Оценка</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criteriaData.map((category, categoryIndex) => {
            const counter =
              categoryIndex === 0
                ? 0
                : criteriaData
                    .slice(0, categoryIndex)
                    .reduce((acc, cat) => acc + cat.criteria.length, 0);

            return (
              <React.Fragment key={`category-${categoryIndex}`}>
                <TableRow>
                  <TableCell colSpan={2} className="bg-gray-50 font-semibold">
                    {category.category}
                  </TableCell>
                </TableRow>
                {category.criteria.map((criterion, criterionIndex) => {
                  const currentIndex = counter + criterionIndex;
                  return (
                    <TableRow
                      key={`criterion-${categoryIndex}-${criterionIndex}`}
                    >
                      <TableCell>{criterion}</TableCell>
                      <TableCell className="text-center">
                        {scoreArray[currentIndex]}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
