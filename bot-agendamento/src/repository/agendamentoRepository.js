const fs = require('fs');
const path = require('path');

// Retorna o caminho do arquivo de agendamentos com base no ID da empresa
function getAgendamentosPath(empresaId) {
  return path.resolve(__dirname, `../data/agendamentos_${empresaId}.json`);
}

// Lê os agendamentos de uma empresa
function getAgendamentos(empresaId) {
  const filePath = getAgendamentosPath(empresaId);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`❌ Erro ao ler agendamentos da empresa ${empresaId}:`, err);
    return [];
  }
}

// Salva um novo agendamento no arquivo da empresa
function salvarAgendamento(empresaId, agendamento) {
  const filePath = getAgendamentosPath(empresaId);
  const agendamentos = getAgendamentos(empresaId);
  agendamentos.push(agendamento);
  try {
    fs.writeFileSync(filePath, JSON.stringify(agendamentos, null, 2));
  } catch (err) {
    console.error(`❌ Erro ao salvar agendamento da empresa ${empresaId}:`, err);
  }
}

module.exports = {
  getAgendamentos,
  salvarAgendamento
};