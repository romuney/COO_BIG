-- =====================================================================================================
-- COO Hub → выгрузка для страницы исполнительного директора «COO Hub · Радар»
-- =====================================================================================================
-- Как пользоваться
--   1. Один раз выполните «Шаг 0»: три коротких запроса покажут, как в витрине записаны «итого»,
--      сколько вариантов у метрик и сколько строк будет в выгрузке.
--   2. Каждый месяц: поменяйте отчётный месяц в params, выполните основной запрос и сохраните
--      результат в CSV (UTF-8), например mockups/exports/coo_hub_2026-09.csv.
--   3. python3 mockups/tools/build_coohub.py mockups/exports/coo_hub_2026-09.csv
--
-- <coo_hub_mart> замените на полное имя витрины (схема.таблица) — во всех запросах ниже.
-- Запросы только читают: ничего не создают и не меняют.
-- Если business_month в витрине — текст, а не дата, сравнивайте со строкой '2026-09-01' без date.


-- -----------------------------------------------------------------------------------------------------
-- Шаг 0.1. Как записаны «итого» и разрезы по сотрудникам (один раз)
-- -----------------------------------------------------------------------------------------------------
-- Ожидаем: самая частая комбинация — все колонки пустые, это и есть «итого».
-- Если «итого» записано словом («Все», «ALL»), впишите его в total_tokens в params основного
-- запроса и в total_tokens конфига (mockups/tools/coohub_config.json).
select emp_specialization_oper_code,
       emp_specialization_it_code,
       seniority_group,
       emp_stream_desc,
       emp_specialization_desc,
       seniority,
       count(*) as rows_cnt
  from <coo_hub_mart>
 where aggr_type = 'M'
   and business_month = date '2026-09-01'
 group by 1, 2, 3, 4, 5, 6
 order by rows_cnt desc
 limit 30;


-- -----------------------------------------------------------------------------------------------------
-- Шаг 0.2. Варианты одной метрики: metric_option и data_type (один раз)
-- -----------------------------------------------------------------------------------------------------
-- Если у метрики несколько строк с разными metric_option — например, «Все юниты» и «Фокусные юниты»,
-- как на вкладках дашборда, — решите, какой вариант видит директор, и впишите в variants конфига.
-- Если не решить, конвертер остановится и перечислит варианты сам.
select metric_name,
       metric_name_eng_lower,
       metric_option,
       data_type,
       count(*)                            as rows_cnt,
       count(distinct functional_unit_rk)  as units_cnt
  from <coo_hub_mart>
 where aggr_type = 'M'
   and business_month = date '2026-09-01'
 group by 1, 2, 3, 4
 order by 1, 3, 4;


-- -----------------------------------------------------------------------------------------------------
-- Шаг 0.3. Сколько строк вернёт основной запрос
-- -----------------------------------------------------------------------------------------------------
-- Superset и DBeaver могут обрезать выгрузку по лимиту строк. После сохранения CSV сравните число
-- строк в файле с этим числом; конвертер тоже предупредит, если строк подозрительно круглое число.
-- Запустите основной запрос ниже, заменив весь его select … from src на select count(*) from src.


-- =====================================================================================================
-- Основной запрос — каждый месяц
-- =====================================================================================================
-- Одна строка = месяц × юнит × метрика. Окно — прошлый год целиком и текущий по отчётный месяц:
-- этого хватает на график «2026 против 2025». Разрез по сегменту сотрудников (HQ / Line / Support)
-- берём только за отчётный месяц — он нужен для плиток конечных юнитов, история по нему не нужна.
with params as (
    select date '2026-09-01'                     as report_month,   -- ← отчётный месяц, первое число
           array['', 'Все', 'ALL', 'Total']::text[] as total_tokens    -- как в витрине записано «все сотрудники»
),
src as (
    select m.*,
           p.report_month,
           coalesce(m.emp_specialization_oper_code::text, '') = any (p.total_tokens) as oper_total,
           coalesce(m.emp_specialization_it_code::text, '')   = any (p.total_tokens)
       and coalesce(m.seniority_group::text, '')              = any (p.total_tokens)
       and coalesce(m.emp_stream_desc::text, '')              = any (p.total_tokens)
       and coalesce(m.emp_specialization_desc::text, '')      = any (p.total_tokens)
       and coalesce(m.seniority::text, '')                    = any (p.total_tokens) as rest_total
      from <coo_hub_mart> m
     cross join params p
     where m.aggr_type = 'M'
       and m.business_month >= (date_trunc('year', p.report_month) - interval '1 year')::date
       and m.business_month <= p.report_month
       -- and m.lvl_unit <= 4                    -- если каталог очень глубокий, отрежьте нижние уровни здесь
       -- and m.metric_option = 'Все юниты'      -- вариант метрики можно выбрать и здесь, а не в конфиге
)
select business_month,
       actual_data_dt,
       aggr_type,
       functional_unit_rk,
       functional_unit_nm,
       parent_functional_unit_rk,
       parent_functional_unit_nm,
       lvl_unit,
       source_metrics_block,
       source_metrics_block_ru,
       metric_type,
       metric_name,
       metric_name_eng_lower,
       change_type,
       value_type,
       metric_option,
       data_type,
       metric_lvl,
       sort_number,
       -- длинные тексты нужны один раз, а не в каждой строке: так файл в разы меньше
       case when business_month = report_month then metric_desc end    as metric_desc,
       case when business_month = report_month then call_to_action end as call_to_action,
       threshold_red,
       threshold_yellow,
       threshold_direction,
       threshold_type,
       value_done,
       value_numerator,
       value_denominator,
       value_final,
       mom_value_final,
       yoy_value_final,
       emp_specialization_oper_code,
       emp_specialization_it_code,
       seniority_group
  from src
 where rest_total
   and (oper_total or business_month = report_month)
 order by functional_unit_rk, metric_name_eng_lower, business_month;
