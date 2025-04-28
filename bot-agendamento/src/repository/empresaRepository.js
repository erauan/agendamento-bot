//const filePath = path.join(__dirname, '../data/empresas.json'); // Caminho correto para o arquivo JSON
//const empresasData = JSON.parse(require('fs').readFileSync(filePath, 'utf-8')); // Carrega os dados uma vez
const path = require('path');
const empresas = require('../data/empresas.json');

module.exports = {
  // Busca empresa pelo número de telefone
  findEmpresaByNumber: (numero) => {
    console.log('🔎 Buscando empresa para:', numero);
    return empresas.find(emp => emp.numero === numero) || null;
  },

  // Retorna serviços da empresa por ID
  getServicos: (idEmpresa) => {
    const empresa = empresas.find(e => e.id === idEmpresa);
    return empresa ? empresa.servicos : [];
  },

  // Retorna horários da empresa por ID
  getHorarios: (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.horarios : [];
  },

  // Retorna barbeiros da empresa por ID
  getBarbeiros: (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.barbeiros : [];
  }
};