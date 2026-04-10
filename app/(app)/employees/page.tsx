import Link from "next/link";
import { EmployeeStatus } from "@prisma/client";
import { ArrowRight, Building2, MapPin, ShieldCheck, UsersRound } from "lucide-react";

import { createEmployeeAction } from "@/app/(app)/employees/actions";
import styles from "../workspace-expansion.module.css";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listEmployees, listEmployeesForSelect } from "@/modules/employees/queries";

function getBadgeVariant(status: EmployeeStatus) {
  if (status === EmployeeStatus.ACTIVE) {
    return "success" as const;
  }

  if (status === EmployeeStatus.OFFBOARDING || status === EmployeeStatus.INACTIVE) {
    return "warning" as const;
  }

  return "outline" as const;
}

function getWorkflowProgress(steps: Array<{ status: string }>) {
  if (!steps.length) {
    return 0;
  }

  return Math.round((steps.filter((step) => step.status === "DONE").length / steps.length) * 100);
}

export default async function EmployeesPage() {
  const user = await requirePermission("view_employees");
  const [employees, managerOptions] = await Promise.all([listEmployees(user.organizationId), listEmployeesForSelect(user.organizationId)]);
  const canManage = hasPermission(user.role, "manage_employees");

  const activeEmployees = employees.filter((employee) => employee.status === EmployeeStatus.ACTIVE).length;
  const onboardingEmployees = employees.filter((employee) => employee.status === EmployeeStatus.ONBOARDING).length;
  const activeWorkflows = employees.reduce((total, employee) => total + employee.workflowRuns.length, 0);
  const managerlessEmployees = employees.filter((employee) => !employee.manager).length;
  const departmentSummary = Array.from(
    employees.reduce((map, employee) => {
      map.set(employee.department, (map.get(employee.department) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Employee management"
        title="Diretorio operacional de colaboradores"
        description="Pessoas, ownership, status e fluxos ativos em uma leitura que ajuda o RH a agir rapido."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/people/onboarding">Abrir onboarding</Link>
            </Button>
          ) : null
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Base total</span>
          <strong className={styles.statValue}>{employees.length}</strong>
          <p className={styles.statHint}>{activeEmployees} colaboradores ativos agora</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Onboarding</span>
          <strong className={styles.statValue}>{onboardingEmployees}</strong>
          <p className={styles.statHint}>Entradas em curso no momento</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Fluxos ativos</span>
          <strong className={styles.statValue}>{activeWorkflows}</strong>
          <p className={styles.statHint}>Onboarding e offboarding em andamento</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Sem gestor</span>
          <strong className={styles.statValue}>{managerlessEmployees}</strong>
          <p className={styles.statHint}>Perfis que ainda pedem ownership claro</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Diretorio</span>
              <h2 className={styles.panelTitle}>Colaboradores em operacao</h2>
              <p className={styles.panelDescription}>Cada pessoa aparece com status, gestor, time e fluxos ativos, sem virar uma ficha isolada do resto do produto.</p>
            </div>

            <div className={styles.list}>
              {employees.length ? (
                employees.map((employee) => (
                  <div key={employee.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <h3 className={styles.itemTitle}>{employee.fullName}</h3>
                        <span className={styles.itemSubtitle}>{employee.title}</span>
                      </div>
                      <Badge variant={getBadgeVariant(employee.status)}>{employee.status}</Badge>
                    </div>

                    <div className={styles.metaList}>
                      <div className={styles.metaRow}>
                        <Building2 className="h-4 w-4 text-primary" />
                        {employee.department}
                      </div>
                      <div className={styles.metaRow}>
                        <MapPin className="h-4 w-4 text-primary" />
                        {employee.location || "Localizacao nao informada"}
                      </div>
                      <div className={styles.metaRow}>
                        <UsersRound className="h-4 w-4 text-primary" />
                        {employee.manager ? `Gestor: ${employee.manager.fullName}` : "Sem gestor definido"}
                      </div>
                      <div className={styles.metaRow}>
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {employee.directReports.length} reporte(s) direto(s)
                      </div>
                    </div>

                    {employee.workflowRuns.length ? (
                      <div className={styles.workflowList}>
                        {employee.workflowRuns.map((run) => {
                          const progress = getWorkflowProgress(run.steps);

                          return (
                            <div key={run.id} className={styles.workflowItem}>
                              <div className={styles.rowBetween}>
                                <strong className={styles.itemTitle}>{run.kind}</strong>
                                <Badge variant={run.kind === "ONBOARDING" ? "success" : "warning"}>{progress}%</Badge>
                              </div>
                              <div className={styles.progressTrack}>
                                <span className={styles.progressFill} style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.emptyState}>Sem fluxos ativos agora.</div>
                    )}

                    <div className={styles.actionRow}>
                      <Button asChild variant="outline">
                        <Link href={`/employees/${employee.id}`}>
                          Abrir perfil
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  Ainda nao ha colaboradores cadastrados. Esse modulo vira a base operacional para pessoas, ownership e historico.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.column}>
          {canManage ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>Novo colaborador</span>
                <h2 className={styles.panelTitle}>Cadastrar pessoa na operacao</h2>
                <p className={styles.panelDescription}>Crie o perfil e deixe o onboarding pronto para entrar no fluxo sem retrabalho manual.</p>
              </div>

              <form action={createEmployeeAction} className={styles.formGrid}>
                <input name="fullName" required placeholder="Nome completo" className={styles.field} />
                <input name="preferredName" placeholder="Nome preferido" className={styles.field} />
                <input name="workEmail" type="email" placeholder="Email corporativo" className={styles.field} />
                <input name="personalEmail" type="email" placeholder="Email pessoal" className={styles.field} />
                <input name="title" required placeholder="Cargo" className={styles.field} />
                <input name="department" required placeholder="Time ou area" className={styles.field} />
                <input name="location" placeholder="Localizacao" className={styles.field} />
                <input name="employmentType" placeholder="Tipo de contratacao" className={styles.field} />
                <input name="startDate" type="date" className={styles.field} />
                <select name="status" defaultValue={EmployeeStatus.ONBOARDING} className={styles.select}>
                  {Object.values(EmployeeStatus).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select name="managerEmployeeId" defaultValue="" className={styles.select}>
                  <option value="">Sem gestor definido</option>
                  {managerOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.title}
                    </option>
                  ))}
                </select>
                <input name="phone" placeholder="Telefone" className={styles.field} />
                <textarea name="notes" placeholder="Notas operacionais iniciais" className={`${styles.textarea} ${styles.span2}`} />
                <div className={styles.span2}>
                  <Button type="submit">Cadastrar colaborador</Button>
                </div>
              </form>
            </section>
          ) : null}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Leitura rapida</span>
              <h2 className={styles.panelTitle}>Composicao do time</h2>
              <p className={styles.panelDescription}>Distribuicao por area e pontos onde ainda falta estrutura de gestao.</p>
            </div>

            <div className={styles.summaryGrid}>
              {departmentSummary.length ? (
                departmentSummary.map(([department, count]) => (
                  <div key={department} className={styles.summaryTile}>
                    <strong>{department}</strong>
                    <span>{count} colaborador(es)</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>Sem dados suficientes para montar a leitura por area.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
