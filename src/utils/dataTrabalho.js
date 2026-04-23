export const getDataTrabalho = () => {
  const dataSalva = localStorage.getItem("data_trabalho");
  const hoje = new Date().toISOString().slice(0, 10);

  return dataSalva || hoje;
};

export const setDataTrabalho = (novaData) => {
  localStorage.setItem("data_trabalho", novaData);
};
