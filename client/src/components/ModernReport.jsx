import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Download, FileText, CheckCircle2, XCircle, Users, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function ModernReport({ votes, participants, questions, onClose }) {
    const stats = useMemo(() => {
        const totalVotes = Object.keys(votes).length;
        const totalParticipants = Object.keys(participants).length;
        const participationRate = totalParticipants > 0 ? Math.round((totalVotes / totalParticipants) * 100) : 0;

        // Distribution
        const distribution = ['A', 'B', 'C', 'D', 'E'].map(opt => ({
            name: opt,
            value: Object.values(votes).filter(v => v === opt).length
        }));

        return { totalVotes, totalParticipants, participationRate, distribution };
    }, [votes, participants]);

    const exportProfessionalCsv = () => {
        const rows = [
            ['Session Report', new Date().toLocaleString()],
            ['Total Participants', stats.totalParticipants],
            ['Total Votes', stats.totalVotes],
            ['Participation Rate', `${stats.participationRate}%`],
            [],
            ['Control ID', 'Participant Name', 'Answer', 'Timestamp']
        ];

        Object.entries(participants).forEach(([id, p]) => {
            rows.push([id, p.name, votes[id] || 'N/A', 'N/A']);
        });

        const body = rows.map(row => row.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([body], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Sesion_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="report-overlay">
            <div className="report-modal">
                <header className="report-header">
                    <div className="title-group">
                        <FileText className="text-blue" size={24} />
                        <h2>Analítica de Sesión</h2>
                    </div>
                    <button className="icon-btn" onClick={onClose}><XCircle size={24} /></button>
                </header>

                <div className="report-grid">
                    <div className="stat-card">
                        <Users className="text-blue" />
                        <div className="stat-val">{stats.totalParticipants}</div>
                        <div className="stat-label">Inscritos</div>
                    </div>
                    <div className="stat-card">
                        <Activity className="text-purple" />
                        <div className="stat-val">{stats.totalVotes}</div>
                        <div className="stat-label">Votos Totales</div>
                    </div>
                    <div className="stat-card">
                        <CheckCircle2 className="text-green" />
                        <div className="stat-val">{stats.participationRate}%</div>
                        <div className="stat-label">Participación</div>
                    </div>
                </div>

                <div className="report-charts">
                    <div className="chart-box">
                        <h3>Distribución de Respuestas</h3>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.distribution}>
                                    <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip
                                        contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {stats.distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-box">
                        <h3>Saturación</h3>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.distribution}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <footer className="report-footer">
                    <button className="btn btn-primary" onClick={exportProfessionalCsv}>
                        <Download size={18} /> Exportar Reporte Profesional
                    </button>
                </footer>
            </div>
        </div>
    );
}
