import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getProjects, getProjectStatusSummary } from '../api/projects';
import { getMyTasks, getTaskStatusSummary } from '../api/tasks';
import { getNotifications } from '../api/notifications';
import { getUserKPIs } from '../api/users';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="stat-card" style={{ borderInlineStart: `3px solid ${color}` }}>
    <div className="stat-icon" style={{ background: bg }}>{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const KPICard = ({ title, value, subtitle, icon, color }) => (
  <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8 }}>{subtitle}</div>}
    </div>
    <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: `rgba(${color}, 0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
      {icon}
    </div>
  </div>
);

const SummaryHeader = ({ title, totalLabel }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
    {totalLabel && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{totalLabel}</span>}
  </div>
);

const projectStatusCards = [
  { key: 'planning', labelKey: 'dashboard.project_status.planning', icon: 'P', color: 'var(--accent-primary)', bg: 'rgba(99,102,241,0.12)' },
  { key: 'active', labelKey: 'dashboard.project_status.active', icon: 'A', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.12)' },
  { key: 'on-hold', labelKey: 'dashboard.project_status.on_hold', icon: 'H', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.12)' },
  { key: 'completed', labelKey: 'dashboard.project_status.completed', icon: 'C', color: 'var(--accent-info)', bg: 'rgba(59,130,246,0.12)' },
  { key: 'cancelled', labelKey: 'dashboard.project_status.cancelled', icon: 'X', color: 'var(--accent-danger)', bg: 'rgba(239,68,68,0.12)' },
];

const taskStatusCards = [
  { key: 'total', labelKey: 'dashboard.task_status.overall', icon: '#', color: 'var(--accent-primary)', bg: 'rgba(99,102,241,0.12)' },
  { key: 'todo', labelKey: 'dashboard.task_status.todo', icon: 'T', color: '#64748b', bg: 'rgba(100,116,139,0.14)' },
  { key: 'in-progress', labelKey: 'dashboard.task_status.in_progress', icon: 'IP', color: 'var(--accent-info)', bg: 'rgba(59,130,246,0.12)' },
  { key: 'review', labelKey: 'dashboard.task_status.review', icon: 'R', color: 'var(--accent-warning)', bg: 'rgba(245,158,11,0.12)' },
  { key: 'completed', labelKey: 'dashboard.task_status.completed', icon: 'C', color: 'var(--accent-success)', bg: 'rgba(16,185,129,0.12)' },
  { key: 'blocked', labelKey: 'dashboard.task_status.blocked', icon: 'B', color: 'var(--accent-danger)', bg: 'rgba(239,68,68,0.12)' },
  { key: 'overdue', labelKey: 'dashboard.task_status.overdue', icon: '!', color: 'var(--accent-danger)', bg: 'rgba(239,68,68,0.12)' },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [projectSummary, setProjectSummary] = useState({ statuses: {}, total: 0 });
  const [taskSummary, setTaskSummary] = useState({ statuses: {}, total: 0, overdue: 0 });
  const [notifications, setNotifications] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, tRes, nRes, kpiRes, projectSummaryRes, taskSummaryRes] = await Promise.allSettled([
          getProjects({ limit: 5 }),
          getMyTasks(),
          getNotifications({ limit: 5 }),
          getUserKPIs(),
          getProjectStatusSummary(),
          getTaskStatusSummary()
        ]);
        if (pRes.status === 'fulfilled') setProjects(pRes.value.data.data?.projects || pRes.value.data.data || []);
        if (tRes.status === 'fulfilled') setMyTasks(tRes.value.data.data?.tasks || tRes.value.data.data || []);
        if (nRes.status === 'fulfilled') setNotifications(nRes.value.data.data?.notifications || nRes.value.data.data || []);
        if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value.data.data);
        if (projectSummaryRes.status === 'fulfilled') setProjectSummary(projectSummaryRes.value.data.data);
        if (taskSummaryRes.status === 'fulfilled') setTaskSummary(taskSummaryRes.value.data.data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      }
      setLoading(false);
    };
    load();
  }, []);

  const projectCounts = projectSummary.statuses || {};
  const taskCounts = taskSummary.statuses || {};
  const activeMyTasks = myTasks.filter((task) => task.status !== 'completed');
  const taskTime = kpis?.taskTime || { totalEstimated: 0, totalActual: 0, efficiencyRatio: 0 };
  const productivity = kpis?.productivity || { score: 0, tasksClosedOnTime: 0, totalCompleted: 0 };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greetings.morning');
    if (h < 17) return t('dashboard.greetings.afternoon');
    return t('dashboard.greetings.evening');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner spinner-lg"></div>
    </div>
  );

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {getGreeting()}, {user?.firstName}! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
            {t('dashboard.welcome_text')}
          </p>
        </div>
        <Avatar user={user} size="lg" />
      </div>

      {/* Interactive KPIs */}
      {kpis && (
        <div className="grid-3" style={{ marginBottom: 28 }}>
          <KPICard 
            title={t('dashboard.kpi.avg_completion')}
            value={t('dashboard.kpi.days', { count: kpis.avgCompletionDays })}
            subtitle={<span>{kpis.completedTasks || 0} {t('dashboard.task_status.completed').toLowerCase()}</span>}
            icon="⏱️"
            color="99, 102, 241"
          />
          <KPICard 
            title={t('dashboard.kpi.task_time')}
            value={(taskTime.efficiencyRatio * 100).toFixed(0) + '%'}
            subtitle={<span>{taskTime.totalActual}h / {taskTime.totalEstimated}h {t('dashboard.kpi.estimated')}</span>}
            icon="⏳"
            color="245, 158, 11"
          />
          <KPICard 
            title={t('dashboard.kpi.productivity')}
            value={productivity.score}
            subtitle={<span>{productivity.tasksClosedOnTime}/{productivity.totalCompleted} {t('dashboard.kpi.tasks_closed')}</span>}
            icon="🚀"
            color="16, 185, 129"
          />
        </div>
      )}

      {/* Project status summary */}
      <SummaryHeader title={t('dashboard.project_status.title')} totalLabel={t('dashboard.summary_total', { count: projectSummary.total || 0 })} />
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {projectStatusCards.map((status) => (
          <StatCard
            key={status.key}
            icon={status.icon}
            label={t(status.labelKey)}
            value={projectCounts[status.key] || 0}
            color={status.color}
            bg={status.bg}
          />
        ))}
      </div>

      {/* Task status summary */}
      <SummaryHeader title={t('dashboard.task_status.title')} totalLabel={t('dashboard.summary_overall', { count: taskSummary.total || 0 })} />
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {taskStatusCards.map((status) => (
          <StatCard
            key={status.key}
            icon={status.icon}
            label={t(status.labelKey)}
            value={status.key === 'total' ? taskSummary.total || 0 : status.key === 'overdue' ? taskSummary.overdue || 0 : taskCounts[status.key] || 0}
            color={status.color}
            bg={status.bg}
          />
        ))}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Recent Projects */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.recent_projects')}</h3>
            <Link to="/projects" style={{ fontSize: 12.5, color: 'var(--text-accent)' }}>{t('dashboard.view_all')}</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <div className="empty-icon">📁</div>
                <div className="empty-title">{t('dashboard.no_projects')}</div>
                <Link to="/projects"><button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>{t('dashboard.create_project')}</button></Link>
              </div>
            ) : projects.slice(0, 5).map((p) => (
              <Link key={p._id} to={`/projects/${p._id}`}>
                <div className="card" style={{ padding: '16px 18px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || '#6366f1', flexShrink: 0 }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.members?.length || 0} {t('dashboard.members')} · {p.progress || 0}% {t('dashboard.complete')}
                      </div>
                    </div>
                    <Badge status={p.status} />
                  </div>
                  <div className="progress-bar" style={{ marginTop: 10 }}>
                    <div className="progress-fill" style={{ width: `${p.progress || 0}%` }}></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* My Tasks & Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Tasks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.my_active_tasks')}</h3>
              <Link to="/tasks" style={{ fontSize: 12.5, color: 'var(--text-accent)' }}>{t('dashboard.view_all')}</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeMyTasks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {t('dashboard.no_tasks')}
                </div>
              ) : activeMyTasks.slice(0, 4).map((tItem) => (
                <div key={tItem._id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: tItem.priority === 'urgent' ? 'var(--accent-danger)' : tItem.priority === 'high' ? 'var(--accent-warning)' : 'var(--accent-primary)',
                  }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tItem.title}</div>
                    {tItem.dueDate && (
                      <div style={{ fontSize: 11.5, color: tItem.isOverdue ? 'var(--accent-danger)' : 'var(--text-muted)', marginTop: 2 }}>
                        {t('dashboard.due', { date: new Date(tItem.dueDate).toLocaleDateString() })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Badge status={tItem.status} />
                    <Badge priority={tItem.priority} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Notifications */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.recent_activity')}</h3>
              <Link to="/notifications" style={{ fontSize: 12.5, color: 'var(--text-accent)' }}>{t('dashboard.view_all')}</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {t('dashboard.no_notifications')}
                </div>
              ) : notifications.slice(0, 4).map((n) => (
                <div key={n._id} className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', opacity: n.isRead ? 0.6 : 1 }}>
                  {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)', marginTop: 6, flexShrink: 0 }}></div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {new Date(n.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
