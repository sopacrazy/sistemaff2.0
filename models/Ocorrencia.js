const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql',
});

const Ocorrencia = sequelize.define('Ocorrencia', {
  numero: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  remetente: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  data: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  cliente: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  valor: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  motivo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  acao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dataTratativa: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  statusInterno: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bilhete: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  motorista: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  conferente: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ajudante: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  vendedor: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'ocorrencias',
});

module.exports = Ocorrencia;
