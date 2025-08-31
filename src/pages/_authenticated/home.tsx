import { createFileRoute } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useState } from 'react';
import Dialog from '@/components/general-components/Dialog';
import RichTextEditor from '@/components/general-components/RichTextEditor';
import { Button } from '@/components/ui/button';

const dataUsuarios = [
  { name: "Seg", usuários: 3 },
  { name: "Ter", usuários: 5 },
  { name: "Qua", usuários: 7 },
  { name: "Qui", usuários: 6 },
  { name: "Sex", usuários: 4 },
];

const dataFinanceiro = [
  { name: "Jan", receita: 4000, despesas: 2400 },
  { name: "Fev", receita: 3000, despesas: 1398 },
  { name: "Mar", receita: 2000, despesas: 9800 },
  { name: "Abr", receita: 2780, despesas: 3908 },
  { name: "Mai", receita: 1890, despesas: 4800 },
];

const dataModulos = [
  { name: "Estoque", value: 300 },
  { name: "Financeiro", value: 400 },
  { name: "CRM", value: 200 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

export const Route = createFileRoute('/_authenticated/home')({
  component: Home,
})

function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorContent, setEditorContent] = useState<string>('');

  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    console.log('Conteúdo do editor:', content);
  };

  return (
      <div className="p-8 bg-background/5 min-h-screen">
        {/* Título da Dashboard */}
        <h1 className="text-3xl font-bold mb-6">Dashboard - Hub do Sistema</h1>
        
        {/* Botão para abrir o editor */}
        <div className="mb-6">
          <Button onClick={() => setDialogOpen(true)} className="mb-4">
            Abrir Editor de Texto Rico
          </Button>
          
          <Dialog
            title="Editor de Texto Rico"
            description="Crie e edite conteúdo para blogs, aulas e artigos"
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            showBttn={false}
            className="max-w-5xl"
          >
            <div className="space-y-4">
              <RichTextEditor 
                value={editorContent}
                onChange={handleEditorChange}
                placeholder="Comece a escrever seu conteúdo aqui..."
                height="50vh"
                // onImageUpload customizado é opcional - por padrão usa S3
              />
            </div>
          </Dialog>
        </div>
  
        {/* Cards principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Avisos</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Sistema em manutenção programada para o próximo sábado, das 02:00 às 04:00.</p>
              <p>Novos módulos disponíveis para compra!</p>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>Usuários Online</CardTitle>
            </CardHeader>
            <CardContent>
              <p>5 usuários conectados.</p>
              <p>Último acesso: 21/10/2024 às 10:00.</p>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p>1. João: "Consegui acessar o módulo financeiro!"</p>
              <p>2. Maria: "O suporte está muito rápido, parabéns!"</p>
            </CardContent>
          </Card>
        </div>
  
        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gráfico de Barras - Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dataUsuarios}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usuários" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
  
          {/* Gráfico de Linhas - Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle>Receita vs Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dataFinanceiro}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="receita" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="despesas" stroke="#ff7300" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
  
          {/* Gráfico de Pizza - Módulos */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Módulos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={dataModulos} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8">
                    {dataModulos.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };