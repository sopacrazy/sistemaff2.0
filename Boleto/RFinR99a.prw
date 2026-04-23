#INCLUDE "Protheus.ch"
#INCLUDE "TopConn.ch"
#INCLUDE "Font.ch"
#Include "RPTDef.ch"
#Include "FWPrintSetup.ch"

/*/{Protheus.doc} RFINR99A
	(Rotina de impressão de Boletos)
	@type  Function u_RFINR99A()
	@author Flávio Macieira
	@since 02/07/2021
	@version 1
	/*/

User Function RFINR99A(lAuto,cPrefixo,cNumero,cParcela,cCliente,cLoja,cBanco,cAgencia,cConta)

	Local aRegs			:= {}
	Local aTamSX3		:= {}
//	Local lEnd			:= .F.
	Local cPerg			:= PADR("RFINR99",LEN (SX1->X1_GRUPO))
	Local cUserAut		:= SuperGetMV('LH_PARBOL',.F.,"000000|000011|000039|000023|000008|000005|000042|000010") //admin,Larissa,Priscila,Regina,Maria,Ane,Priscila,Edja
	Local cUserID		:= RetCodUsr()
	Local dDataemis1	:= Ctod("")
	Local dDataemis2	:= Ctod("")

	Default lAuto 		:= .F.
	Default cPrefixo 	:= ""
	Default cNumero 	:= ""
	Default cParcela 	:= ""
	Default cCliente 	:= ""
	Default cLoja 		:= ""
	Default cBanco 		:= ""//PadR( "001", TAMSX3("A6_COD")[1] )
	Default cAgencia 	:= ""//PadR( "8193", TAMSX3("A6_AGENCIA")[1] )
	Default cConta 		:= ""//PadR( "635", TAMSX3("A6_NUMCON")[1] )
		
	Private Titulo		:= "Boleto de Cobrança com Código de Barras"
	Private aReturn		:= {"Banco", 1,"Financeiro", 2, 2, 1, "",1 }
	Private aLst		:= {}
	Private aEnvMail 	:= {}
	Private lJob		:= lAuto
	
	dDataemis1 := CtoD("01/01/2023") //Date()
	dDataemis2 := CtoD("31/12/2049")

	cBanco 	 := PadR( cBanco, TAMSX3("A6_COD")[1] )
	cAgencia := PadR( cAgencia, TAMSX3("A6_AGENCIA")[1] )
	cConta	 := PadR( cConta, TAMSX3("A6_NUMCON")[1] )
	
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Cria array com as perguntas da rotina ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	aTamSX3	:= TAMSX3("E1_PREFIXO")
	aAdd(aRegs,{cPerg,"01","Do Prefixo"			  ,"","","mv_ch1",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR01",""	 ,"",	 			"",				"",						"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aAdd(aRegs,{cPerg,"02","Ate Prefixo"		  ,"","","mv_ch2",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR02",""	 ,"",	 			"",				Replic('z',aTamSX3[1]),	"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aTamSX3	:= TAMSX3("E1_NUM")
	aAdd(aRegs,{cPerg,"03","Do Numero"			  ,"","","mv_ch3",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR03",""	 ,"",	  			"",				"",						"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aAdd(aRegs,{cPerg,"04","Ate Numero"			  ,"","","mv_ch4",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR04",""	 ,"",	  			"",				Replic('z',aTamSX3[1]),	"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aTamSX3	:= TAMSX3("E1_PARCELA")
	aAdd(aRegs,{cPerg,"05","Da Parcela"			  ,"","","mv_ch5",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR05",""	 ,"",	  			"",				"",						"","",	 			"",				"",				"","","",		"","","","","","","","","","","","","","",		"","011",	"",""})
	aAdd(aRegs,{cPerg,"06","Ate Parcela"		  ,"","","mv_ch6",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR06",""	 ,"",	  			"",				Replic('z',aTamSX3[1]),	"","",	 			"",				"",				"","","",		"","","","","","","","","","","","","","",		"","011",	"",""})
	aTamSX3	:= TAMSX3("E1_CLIENTE")
	aAdd(aRegs,{cPerg,"07","Do Cliente"			  ,"","","mv_ch7",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR07",""	 ,"",	  			"",				"",						"","",	 			"",				"",	 			"","","",		"","","","","","","","","","","","","","SA1",	"","001",	"",""})
	aAdd(aRegs,{cPerg,"08","Ate Cliente"		  ,"","","mv_ch8",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR08",""	 ,"",	  			"",				Replic('z',aTamSX3[1]),	"","",	 			"",				"",	 			"","","",		"","","","","","","","","","","","","","SA1",	"","001",	"",""})
	aTamSX3	:= TAMSX3("E1_LOJA")
	aAdd(aRegs,{cPerg,"09","Da Loja"			  ,"","","mv_ch9",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR09",""	 ,"",	  			"",				"",						"","",	 			"",				"",	 			"","","",		"","","","","","","","","","","","","","",		"","002",	"",""})
	aAdd(aRegs,{cPerg,"10","Ate Loja"			  ,"","","mv_chA",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR10",""   ,"",	  			"",				Replic('z',aTamSX3[1]),	"","",	 			"",				"",	 			"","","",		"","","","","","","","","","","","","","",		"","002",	"",""})
	aTamSX3	:= TAMSX3("EE_CODIGO")
	aAdd(aRegs,{cPerg,"11","Banco Cobranca"		  ,"","","mv_chB",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR11",""	 ,	  			"",	  			"",				"",						"","",	 			"",				"",	 			"","","",		"","","","","","","","","","","","","","SEECR",	"","007",	"",""})
	aTamSX3	:= TAMSX3("EE_AGENCIA")                                                                                                                                                                                                              
	aAdd(aRegs,{cPerg,"12","Agencia Cobranca"	  ,"","","mv_chC",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR12",""	 ,	  			"",	  			"",				"",						"","",	 			"",	  			"",	  			"","","",		"","","","","","","","","","","","","","",		"","008",	"",""})
	aTamSX3	:= TAMSX3("EE_CONTA")
	aAdd(aRegs,{cPerg,"13","Conta Cobranca"		  ,"","","mv_chD",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR13",""	 ,	  			"",	  			"",				"",						"","",	 			"",	  			"",	  			"","","",		"","","","","","","","","","","","","","",		"","009",	"",""})
	aTamSX3	:= TAMSX3("EE_SUBCTA")
	aAdd(aRegs,{cPerg,"14","Carteira Cobrança"	  ,"","","mv_chE",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR14",""	 ,	  			"",	  			"",				"",						"","",	 			"",	  			"",	  			"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aAdd(aRegs,{cPerg,"15","Re-Impressao"		  ,"","","mv_chF","N"		,	     01,		00,	2,"C","","MV_PAR15","Sim","Sim",			"Sim",			"",						"","Nao",			"Nao",			"Nao",			"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aAdd(aRegs,{cPerg,"16","Traz Titulos Marcados","","","mv_chH","N"		, 		 01,		00,	2,"C","","MV_PAR16","Sim","Sim",			"Sim",			"",						"","Nao",			"Nao",			"Nao",			"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aTamSX3	:= TAMSX3("E1_EMISSAO")
	aAdd(aRegs,{cPerg,"17","Dt.Emiss Inicial"	  ,"","","mv_chJ",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR17",""	 ,	 "",				"",				"01/01/19",				"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aAdd(aRegs,{cPerg,"18","Dt.Emiss Final"		  ,"","","mv_chK",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR18",""	 ,   "",				"",				"31/12/49",				"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aTamSX3	:= TAMSX3("E1_VENCREA")
	aAdd(aRegs,{cPerg,"19","Vencto Real Inicial"  ,"","","mv_chM",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR19",""	 ,""   ,				"",				"01/01/19",				"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aAdd(aRegs,{cPerg,"20","Vencto Real Final"	  ,"","","mv_chN",aTamSX3[3],aTamSx3[1],aTamSX3[2],	0,"G","","MV_PAR20",""	 ,				"",				"",				"31/12/49",				"","",				"",				"",				"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	aAdd(aRegs,{cPerg,"21","Envia e-mail"		  ,"","","mv_chO","N"		,   	 01,		00,	2,"C","","MV_PAR21","Sim",			"Sim",			"Sim",			"",						"","Nao",			"Nao",			"Nao",			"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
//	aAdd(aRegs,{cPerg,"22","Envia WhatsApp"		  ,"","","mv_chP","N"		,   	 01,		00,	2,"C","","MV_PAR22","Sim",			"Sim",			"Sim",			"",						"","Nao",			"Nao",			"Nao",			"","","",		"","","","","","","","","","","","","","",		"","",		"",""})
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Cria SX1 se não existir ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	CriaSx1(aRegs)

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Atualiza o SX1 se a chamada foi feita por outro programa ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If lJob
		dbSelectArea("SA6")
		dbSetOrder(1)
		If !dbSeek(FWxFilial("SA6")+cBanco+cAgencia+cConta,.f.)
			Aviso("Impressao de Boletos","Configuraçao de banco nao encontrada para o banco "+Alltrim(cbanco)+", agencia "+Alltrim(cAgencia)+", conta "+Alltrim(cConta)+" do cliente "+Alltrim(SA1->A1_NOME)+". Verifique o cadastro de parametros de bancos para que a rotina possa ser gerada.",{"OK"},,"Atencao:")
			DbSelectArea("QUERY")
			Return(Nil)
		EndIf

		dbSelectArea("SEE")
		dbSetOrder(1)
		If MsSeek(FWxFilial("SEE")+cBanco+cAgencia+cConta)
			cCarteira 	:= SEE->EE_SUBCTA
			cConvenio 	:= Alltrim(SEE->EE_CODEMP)
		EndIf

		dbSelectArea("SX1")
		dbSeTorder(1)
		MsSeek(cPerg)
		While !Eof() .and. SX1->X1_GRUPO == cPerg
			Reclock("SX1",.F.)
			If SX1->X1_ORDEM == "01"
				SX1->X1_CNT01	:= cPrefixo
			ElseIf SX1->X1_ORDEM == "02"
				SX1->X1_CNT01	:= cPrefixo
			ElseIf SX1->X1_ORDEM == "03"
				SX1->X1_CNT01	:= cNumero
			ElseIf SX1->X1_ORDEM == "04"
				SX1->X1_CNT01	:= cNumero
			ElseIf SX1->X1_ORDEM == "05"
				SX1->X1_CNT01	:= cParcela
			ElseIf SX1->X1_ORDEM == "06"
				SX1->X1_CNT01	:= "ZZ"
			ElseIf SX1->X1_ORDEM == "07"
				SX1->X1_CNT01	:= cCliente
			ElseIf SX1->X1_ORDEM == "08"
				SX1->X1_CNT01	:= cCliente
			ElseIf SX1->X1_ORDEM == "09"
				SX1->X1_CNT01	:= cLoja
			ElseIf SX1->X1_ORDEM == "10"
				SX1->X1_CNT01	:= cLoja
			ElseIf SX1->X1_ORDEM == "11"
				SX1->X1_CNT01	:= SA6->A6_COD
			ElseIf SX1->X1_ORDEM == "12"
				SX1->X1_CNT01	:= SA6->A6_AGENCIA
			ElseIf SX1->X1_ORDEM == "13"
				SX1->X1_CNT01	:= SA6->A6_NUMCON
			ElseIf SX1->X1_ORDEM == "14"
				SX1->X1_CNT01	:= cCarteira
			ElseIf SX1->X1_ORDEM == "15"
				SX1->X1_PRESEL	:= 2
			ElseIf SX1->X1_ORDEM == "16'"
				SX1->X1_PRESEL	:= 1
			ElseIf SX1->X1_ORDEM == "21"
				SX1->X1_PRESEL	:= 1
	//		ElseIf SX1->X1_ORDEM == "22"
	//			SX1->X1_PRESEL	:= 2
			EndIf
			MsUnLock()
			dbSkip()
		EndDo
		Pergunte(cPerg,.F.)

		mv_par01 := cPrefixo
		mv_par02 := cPrefixo
		mv_par03 := cNumero
		mv_par04 := cNumero
		mv_par05 := cParcela
		mv_par06 := "ZZ"
		mv_par07 := cCliente
		mv_par08 := cCliente
		mv_par09 := cLoja
		mv_par10 := cLoja
		mv_par11 := SA6->A6_COD
		mv_par12 := SA6->A6_AGENCIA
		mv_par13 := SA6->A6_NUMCON
		mv_par14 := cCarteira
		mv_par15 := 2
		mv_par17 := dDataemis1
		mv_par18 := dDataemis2
		mv_par19 := dDataemis1
		mv_par20 := dDataemis2
		mv_par21 := 1

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Chama a pergunte para definir os parâmetros iniciais ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	Else
		If !Pergunte(cPerg, .T.)
			Return(Nil)
		EndIf
		If !cUserID $ cUserAut //usuários faturamento
			mv_par15 := 1 //Somente reimpressão
			mv_par21 := 2 //Envia e-mail 2 = "Não"
		EndIf

	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Chama a rotina para carregar os dados a serem processados ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If lJob
		CallLst()
	Else
		Processa( { || CallLst() }, "Selecionando dados a processar", Titulo )
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Verifica se há dados a serem exibidos ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If Len(aLst) > 0
		If lJob
			CallMark()
		Else
			Processa( { || CallMark() }, "Selecionando dados a processar", Titulo )
		EndIf	
	Else
		Aviso(	Titulo,;
				"Não existem dados a serem impressos. Verifique os parâmetros.",;
				{"&Continua"},,;
				"Sem Dados" )
	EndIf

Return(Nil)



/*/{Protheus.doc} CallLst
	(Carrega os registros a serem processados)
	@type  Function
	@author Flávio Macieira
	@since 02/08/2021
	@version 1
	/*/

Static Function CallLst()

	Local aAreaAtu	:= FWGetArea()
	Local aTamSX3	:= {}
	Local nCnt		:= 0
	Local cQry		:= ""
	//Local cPgtVista := GetMV("MV_#AVISTA",,)

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Monta a query de seleção ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	cQry	:= " SELECT SE1.R_E_C_N_O_ AS REGSE1,SE1.E1_PREFIXO,SE1.E1_NUM,SE1.E1_PARCELA,SE1.E1_TIPO,SE1.E1_CLIENTE,"
	cQry	+= " SE1.E1_LOJA,SE1.E1_NOMCLI,SE1.E1_EMISSAO,SE1.E1_VENCTO,SE1.E1_VENCREA,SE1.E1_VALOR,SE1.E1_PORTADO,"
	cQry	+= " SE1.E1_NUMBCO,SA1.A1_ENDCOB,SA1.A1_CEP,SA1.A1_CEPC,SE1.E1_PEDIDO, SA1.A1_CGC, SA1.A1_ZCOBMAI"
	cQry	+= " FROM "+RetSqlName("SE1")+" SE1 (NOLOCK),"+RetSqlName("SA1")+" SA1 (NOLOCK)"
	cQry	+= " WHERE SE1.E1_FILIAL = '"+FWxFilial("SE1")+"'"
	cQry	+= " AND SE1.E1_SALDO > 0"
	cQry	+= " AND SE1.E1_EMISSAO BETWEEN '"+DToS(mv_par17)+"' AND '"+DToS(mv_par18)+"'
	cQry	+= " AND SE1.E1_VENCREA BETWEEN '"+DToS(mv_par19)+"' AND '"+DToS(mv_par20)+"'
	cQry	+= " AND SE1.E1_PREFIXO BETWEEN '"+mv_par01+"' AND '"+mv_par02+"'"
	cQry	+= " AND SE1.E1_NUM BETWEEN '"+mv_par03+"' AND '"+mv_par04+"'"
	cQry	+= " AND SE1.E1_PARCELA BETWEEN '"+mv_par05+"' AND '"+mv_par06+"'"
	cQry	+= " AND SE1.E1_TIPO IN('NF ','DP ','FT ')"
	cQry	+= " AND SE1.E1_CLIENTE BETWEEN '"+mv_par07+"' AND '"+mv_par08+"'"
	cQry	+= " AND SE1.E1_LOJA BETWEEN '"+mv_par09+"' AND '"+mv_par10+"'"
	If mv_par15 == 1
		cQry	+= " AND SE1.E1_NUMBCO <> '"+Space(TAMSX3("E1_NUMBCO")[1])+"'"
		If SE1->(FieldPos("E1_BCOBOL")) > 0
			cQry	+= " AND SE1.E1_BCOBOL = '"+mv_par11+"'"
		Else
			cQry	+= " AND SE1.E1_PORTADO = '"+mv_par11+"'"
		EndIf
	Else
		cQry	+= " AND SE1.E1_NUMBCO = '"+Space(TAMSX3("E1_NUMBCO")[1])+"'"
	Endif
	cQry	+= " AND SE1.D_E_L_E_T_ = ' '"
	cQry	+= " AND SA1.A1_FILIAL = '"+FWxFilial("SA1")+"'"
	cQry	+= " AND SA1.A1_COD = SE1.E1_CLIENTE"
	cQry	+= " AND SA1.A1_LOJA = SE1.E1_LOJA"
	cQry	+= " AND SA1.D_E_L_E_T_ = ' '"
	cQry	+= " ORDER BY SE1.E1_NUM,SE1.E1_CLIENTE,SE1.E1_LOJA,SE1.E1_PREFIXO,SE1.E1_PARCELA,SE1.E1_TIPO"


	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Se existir o alias temporário, fecha para não dar erro ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If Select("RFINR99A") > 0
		dbSelectArea("RFINR99A")
		dbCloseArea()
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Executa a select no banco para pegar os registros a processar ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	TCQUERY cQry NEW ALIAS "RFINR99A"
	dbSelectArea("RFINR99A")
	dbGoTop()

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Compatibiliza os campos com a TopField ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	aTamSX3	:= TAMSX3("E1_EMISSAO")
	TCSETFIELD("RFINR99A", "E1_EMISSAO",	aTamSX3[3], aTamSX3[1], aTamSX3[2])
	aTamSX3	:= TAMSX3("E1_VENCTO")
	TCSETFIELD("RFINR99A", "E1_VENCTO",		aTamSX3[3], aTamSX3[1], aTamSX3[2])
	aTamSX3	:= TAMSX3("E1_VENCREA")
	TCSETFIELD("RFINR99A", "E1_VENCREA",	aTamSX3[3], aTamSX3[1], aTamSX3[2])
	aTamSX3	:= TAMSX3("E1_VALOR")
	TCSETFIELD("RFINR99A", "E1_VALOR",		aTamSX3[3], aTamSX3[1], aTamSX3[2])

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Conta os registros a serem processados ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	RFINR99A->( dbEval( { || nCnt++ },,{ || !Eof() } ) )
	dbGoTop()

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Alimenta array com os dados a serem exibidos na tela de marcação ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	dbSelectArea("SC5")
	SC5->( dbSetOrder(1) ) // C5_FILIAL+C5_NUM

	dbSelectArea("RFINR99A")
	dbGoTop()
	ProcRegua( nCnt )

	While !Eof()
		
		// Movimenta regua de Impressão 
		IncProc( "Título: " + RFINR99A->E1_PREFIXO +"/"+ RFINR99A->E1_NUM +"/"+ RFINR99A->E1_PARCELA )
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Cria o elemento no array ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		aAdd( aLst, { (mv_par16 == 1),;                                               // 1
					RFINR99A->E1_PREFIXO,;                                            // 2
					RFINR99A->E1_NUM,;                                                // 3
					RFINR99A->E1_PARCELA,;      					                  // 4
					RFINR99A->E1_TIPO,;                                               // 5
					RFINR99A->E1_CLIENTE,;                                            // 6
					RFINR99A->E1_LOJA,;                                               // 7
					RFINR99A->E1_NOMCLI,;                                             // 8
					RFINR99A->E1_EMISSAO,;                                            // 9
					RFINR99A->E1_VENCTO,;                                             //10
					RFINR99A->E1_VENCREA,;                                            //11
					RFINR99A->E1_VALOR,;                                              //12
					RFINR99A->E1_PORTADO,;                                            //13
					RFINR99A->REGSE1,;                                                //14
					If( "MESMO" $ RFINR99A->A1_ENDCOB, .T., .F. ),;                   //15
					If( !Empty( RFINR99A->A1_CEP + RFINR99A->A1_CEPC ), .T., .F. ),;  //16
					RFINR99A->A1_ZCOBMAI,;                                            //17
					RFINR99A->E1_NUMBCO;                                              //18
					})
		dbSelectArea("RFINR99A")
		dbSkip()
	EndDo

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Fecha a área de trabalho ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	dbSelectArea("RFINR99A")
	dbCloseArea()

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Restaura área original ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	FWRestArea(aAreaAtu)

Return(Nil)


/*/{Protheus.doc} CallMark
	(Monta a tela de impressão gráfica )
	@type  Function
	@author user
	@since 02/08/2021
	@version 1
	/*/

Static Function CallMark()

	Local oLst
	Local oDlg
	Local oOk			:= LoadBitMap(GetResources(), "LBTIK")
	Local oNo			:= LoadBitMap(GetResources(), "LBNO")
	Local oAzul			:= LoadBitMap(GetResources(), "BR_AZUL")
//	Local oAmarelo		:= LoadBitMap(GetResources(), "BR_AMARELO")
	Local oVermelho		:= LoadBitMap(GetResources(), "BR_VERMELHO")
	Local lProc			:= .F.
	Local nLoop			:= 0
	Local nBotao		:= 0
	Local cTotal        := 0
	Local nXX			:= 1

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Monta interface com usuário para efetuar a marcação dos títulos ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If !lJob
		DEFINE MSDIALOG oDlg TITLE "Seleção de Títulos" FROM 000,000 TO 400,780 OF oDlg PIXEL
		@ 005,003	LISTBOX oLst ;
					FIELDS HEADER	" ",;
									" ",;
									"Prefixo",;
									"Número",;
									"Parc.",;
									"Tipo",;
									"Cliente",;
									"Loja",;
									"Nome",;
									"Emissão",;
									"Vencto.",;
									"Venc.Real",;
									"Valor",;
									"Portador" ;
					COLSIZES	GetTextWidth(0,"BB"),;
								GetTextWidth(0,"BB"),;
								GetTextWidth(0,"BBB"),;
								GetTextWidth(0,"BBB"),;
								GetTextWidth(0,"BB"),;
								GetTextWidth(0,"BB"),;
								GetTextWidth(0,"BBBB"),;
								GetTextWidth(0,"BB"),;
								GetTextWidth(0,"BBBBBBBBBBB"),;
								GetTextWidth(0,"BBBB"),;
								GetTextWidth(0,"BBBB"),;
								GetTextWidth(0,"BBBB"),;
								GetTextWidth(0,"BBBBBBBBB"),;
								GetTextWidth(0,"BBBBBBBBBBBBB") ;
					ON DBLCLICK(	aLst[oLst:nAt,1] := !aLst[oLst:nAt,1],;
											oLst:Refresh() ) ;
					SIZE 385,170 OF oDlg PIXEL

		oLst:SetArray(aLst)
		oLst:bLine := { || {	If(aLst[oLst:nAt,01], oOk, oNo),;												// Marca
								If(!aLst[oLst:nAt,16], oVermelho, oAzul),;	// Led - Envia com NF/Via Correio
								aLst[oLst:nAt,02],;																// Prefixo
								aLst[oLst:nAt,03],;																// Numero
								aLst[oLst:nAt,04],;																// parcela
								aLst[oLst:nAt,05],;																// Tipo
								aLst[oLst:nAt,06],;																// Cliente
								aLst[oLst:nAt,07],;																// Loja
								aLst[oLst:nAt,08],;																// Nome
								DToC(aLst[oLst:nAt,09]),;									   					// Emissão
								DToC(aLst[oLst:nAt,10]),;														// Vencimento
								DToC(aLst[oLst:nAt,11]),;														// Vencimento real
								Transform(aLst[oLst:nAt,12], "@E 999,999,999.99"),;							    // Valor 
								aLst[oLst:nAt,18] ;																// Numero Banco
								} }

				For nLoop := 1 To Len(aLst)
					If aLst[nLoop,1]
						ctotal	:= ((ctotal)+(aLst[nLoop,12]))
					ENDIF
				Next nLoop
				
		
		//@ 180,005 BITMAP oBmp RESNAME "BR_AZUL"			SIZE 16,16 NOBORDER	PIXEL
		//@ 180,015 SAY "Boleto junto com a nota fiscal"	OF oDlg				PIXEL COLOR CLR_HBLUE
		//@ 189,005 BITMAP oBmp RESNAME "BR_AMARELO"		SIZE 16,16 NOBORDER	PIXEL
		//@ 189,015 SAY "Boleto via correio"				OF oDlg				PIXEL COLOR CLR_HBLUE
		@ 180,005 BITMAP oBmp RESNAME "BR_VERMELHO"		SIZE 16,16 NOBORDER	PIXEL
		@ 180,015 SAY "Cliente Sem CEP"				                    	OF oDlg				PIXEL COLOR CLR_HBLUE
		@ 180,100 SAY "Valor total R$ " +cValToChar(cTotal)     	     	OF oDlg				PIXEL COLOR CLR_HBLUE

		DEFINE SBUTTON oBtnOk	FROM 180,350 TYPE 1		ACTION(nBotao := 1, oDlg:End())										ENABLE OF oDlg
		DEFINE SBUTTON oBtnCan	FROM 180,315 TYPE 2		ACTION(nBotao := 2, oDlg:End())										ENABLE OF oDlg
		DEFINE SBUTTON oBtnVis	FROM 180,280 TYPE 15	ACTION(nBotao := 3, VisCli( aLst[oLst:nAt,06], aLst[oLst:nAt,07] ) )	ENABLE OF oDlg
		DEFINE SBUTTON oBtnRef	FROM 180,245 TYPE 17	ACTION(nBotao := 4, CallMark())									    ENABLE OF oDlg

		ACTIVATE DIALOG oDlg CENTERED
	EndIf
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Verifica se teclou no botão confirma ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If lJob
		nBotao := 1
		For nXX := 1 To Len(aLst)
			alst[nXX][1] := .T.
		Next nXX		
	Endif
	If nBotao == 1
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Verifica se tem algum título marcado ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		For nLoop := 1 To Len(aLst)
			If aLst[nLoop,1]
				lProc	:= .T.
				Exit
			EndIf
		Next nLoop

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Avisa usuário que não há título marcado ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If !lProc
			Aviso(	Titulo,;
					"Nenhum título foi marcado. Não há dados a serem impressos.",;
					{"&Continua"},,;
					"Sem Dados" )
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Chama a rotina que irá montar e imprimir o relatório ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		Else
			If lJob
				MontaRel()
			Else
				Processa( { || MontaRel() }, "Montando Imagem do Relatório.", Titulo )
			EndIf
		Endif
	EndIf

Return(Nil)

/*/{Protheus.doc} VisCli
	(Valida cliente )
	@type  Function
	@author Flávio Macieira
	@since 09/12/2021
	@version 01
/*/

Static Function VisCli( cCliente, cLoja )

	Local aAreaAtu	:= FWGetArea()
	Local aAreaSA1	:= SA1->( FWGetArea() )

	Private cCadastro	:= Titulo

	dbSelectArea( "SA1" )
	dbSetOrder( 1 )
	If !MsSeek( FWxFilial( "SA1" ) + cCliente + cLoja )
		Aviso(	Titulo,;
				"Cliente não localizado no cadastro. Contate o Administrador.",;
				{ "&Continua" },,;
				"Cliente: " + cCliente + "/" + cLoja )
	Else
		AxVisual( "SA1", SA1->( Recno() ), 2 )
	EndIf

	FWRestArea( aAreaSA1 )
	FWRestArea( aAreaAtu )

Return( Nil )


/*/{Protheus.doc} MontaRel
	(Monta a imagem do relatório a ser impresso  )
	@type  Function
	@author user
	@since 02/08/2021
	@version 1
	/*/

Static Function MontaRel()

//	Local oPrintPvt
	Local aDadEmp	:= {}
	Local aDadBco	:= {}
	Local aDadTit	:= {}
	Local aDadCli	:= {}
	Local aBarra	:= {}
	Local nLoop		:= 0
	Local nTpImp	:= 0
	Local _nX		:= 1
	Local _nY		:= 1
	Local lEnvioBol := .F.

	Private oPrintPvt
//	Local cStartPath:= GetSrvProfString( "StartPath", "" )
//	Local cFxFim	:= SuperGetMV( "TC_TXFIML", .F., "000002216881" )

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Define o tipo de configuração a ser utilizado na MSBAR ³
	//³ 1 = Polegadas, 2 = Centímetros                         ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	nTpImp	:= 2          

	/*
	nTpImp	:= Aviso(	Titulo,;
						"Os boletos devem ser impressos com qual definição ?",;
						{ "Polegadas", "Centímetros" },,;
						"Definição de Tamanho" )
	*/
			
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Seta as configuração do objeto print ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	//oPrintPvt:= TMSPrinter():New( Titulo )
	MakeDir( "c:\temp\" )  
//	MakeDir( "\dirdoc\cnab\" )
	MakeDir( "\dirdoc\boleto\" )
	If File( "c:\temp\boleto.pdf")
		fErase( "c:\temp\boleto.pdf")
	Endif
	If mv_par21 == 2
		oPrintPvt:=FwmsPrinter():New( "boleto", 6, .t., 'c:\temp\', .T., .F., , , .F., .F., .F., .F., 1)
		oPrintPvt:SetResolution(72)
		oPrintPvt:SetPortrait()
		oPrintPvt:SetPaperSize(DMPAPER_A4)
		oPrintPvt:SetMargin(60, 60, 60, 30)
		oPrintPvt:cPathPDF := "c:\temp\"
		oPrintPvt:lViewPDF := .T.
		
		//nFlags := PD_ISTOTVSPRINTER
		//oSetup := FWPRINTSETUP():NEW( nFLAGS, "Boleto" )
			
	Endif
		//oPrintPvt:Setup()
		//oPrintPvt:SetPortrait() // ou SetLandscape()
		//oPrintPvt:SetSize(215,297)

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Posiciona no Banco ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	dbSelectArea("SA6")
	dbSetOrder(1)
	If !MsSeek(FWxFilial("SA6")+mv_par11+mv_par12+mv_par13)
		Aviso(	Titulo,;
				"Banco/Agência/Conta: "+ AllTrim(mv_par11) +"/"+ AllTrim(mv_par12) +"/"+ AllTrim(mv_par13) +Chr(13)+Chr(10)+;
				"O registro não foi localizado no arquivo. Será desconsiderado.",;
				{"&Continua"},2,;
				"Registro Inválido" )
		Return(Nil)
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Posiciona no Parâmetro do Banco ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	dbSelectArea("SEE")
	dbSetOrder(1)
	If !MsSeek(FWxFilial("SEE")+mv_par11+mv_par12+mv_par13+mv_par14)
		Aviso(	Titulo,;
				"Banco/Agência/Conta/Carteira: "+ AllTrim(mv_par11) +"/"+ AllTrim(mv_par12) +"/"+ AllTrim(mv_par13) +"/"+ AllTrim(mv_par14) + Chr(13) + Chr(10) +;
				"Os parâmetros do banco não foram localizados. Será desconsiderado.",;
				{"&Continua"},2,;
				"Registro Inválido" )
		Return(Nil)
/*	Else
		If Alltrim(SEE->EE_AGENCIA) = "1248" .and. Alltrim(SEE->EE_CONTA) = "09902" .and.SEE->EE_FAXATU = cFxFim	
			Aviso(	Titulo,;
					"Faixa Incial / Faixa Final / Faixa atual: "+ SEE->EE_FAXINI +" / "+ SEE->EE_FAXFIM +" / "+ SEE->EE_FAXATU  + Chr(13) + Chr(10) +;
					"A faixa FIM enviada pelo banco Sofisa foi atingida. Será necessario solicitar novas faixas."+ Chr(13) + Chr(10) +;
					"Atualizar os parâmetros de banco e tambem o parâmetro TC_TXFIML com a faixa fim",;
					{"&Continua"},2,;
					"Registro Inválido" )
			Return(Nil)
		EndIf	*/	
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Chama rotina que pega os dados do banco e empresa ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If !U_TCDadBco(aDadEmp, aDadBco)
		Aviso(	Titulo,;
				"Banco/Agência/Conta: "+ AllTrim(mv_par11) +"/"+ AllTrim(mv_par12) +"/"+ AllTrim(mv_par13) +"/"+ Chr(13) + Chr(10) +;
				"Banco do cliente: "+ SA1->A1_BCO1 + Chr(13) + Chr(10) + ;
				"Não foi possível obter os dados do banco.",;
				{"&Continua"},2,;
				"Registro Inválido" )
		Return(Nil)
	EndIf

	ProcRegua(Len(aLst))

	For nLoop := 1 To Len(aLst)
		
		// Movimenta régua de impressão 
		IncProc( "Título: " + aLst[nLoop,02] +"/"+ aLst[nLoop,03] )

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Só processa se estiver marcado ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If aLst[nLoop,01]
			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Posiciona no título ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			dbSelectArea("SE1")
			dbSetOrder(1)
			dbGoTo(aLst[nLoop,14])
			If Eof() .Or. Bof()
				Aviso(	Titulo,;
						"Título :"+ aLst[nLoop,02] +"/"+ aLst[nLoop,03] +"/"+ aLst[nLoop,04] +"/"+ aLst[nLoop,05] +Chr(13)+Chr(10)+;
						"O título não foi localizado no arquivo. Será desconsiderado.",;
						{"&Continua"},2,;
						"Registro Inválido" )
				Loop
			EndIf

			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Posiciona no Cliente ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			dbSelectArea("SA1")
			dbSetOrder(1)
			If !MsSeek(FWxFilial("SA1")+SE1->E1_CLIENTE+SE1->E1_LOJA)
				Aviso(	Titulo,;
						"Título :"+ aLst[nLoop,02] +"/"+ aLst[nLoop,03] +"/"+ aLst[nLoop,04] +"/"+ aLst[nLoop,05] +Chr(13)+Chr(10)+;
						"Cliente/Loja: "+ SE1->E1_CLIENTE +"/"+ SE1->E1_LOJA +Chr(13)+Chr(10)+;
						"O cliente não foi localizado no arquivo. Será desconsiderado.",;
						{"&Continua"},2,;
						"Registro Inválido" )
				Loop
			EndIf

			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Verifica se o considera o banco definido no cadastro do cliente e ³
			//³ se o banco do parâmetro é o mesmo do cadastro                     ³
	/*		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ		
			If mv_par16 == 1 .And. !Empty(SA1->A1_BCO1) .And. SA1->A1_BCO1 <> mv_par11
				Aviso(	Titulo,;
						"Título :"+ aLst[nLoop,02] +"/"+ aLst[nLoop,03] +"/"+ aLst[nLoop,04] +"/"+ aLst[nLoop,05] +Chr(13)+Chr(10)+;
						"Banco/Agência/Conta: "+ mv_par11 +"/"+ mv_par12 +"/"+ mv_par13 +Chr(13)+Chr(10)+;
						"Banco do cliente: "+ SA1->A1_BCO1 +Chr(13)+Chr(10)+ ;
						"O Banco do cadastro é diferente do parâ,etro. Será desconsiderado.",;
						{"&Continua"},2,;
						"Registro Inválido" )
				Loop
			EndIf
	*/
			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Posiciona no Título ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			dbSelectArea("SE1")

			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Chama rotina que pega os dados do título e cliente ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			If !U_TCDadTit(aDadTit, aDadCli, aBarra, aDadBco)
				Aviso(	Titulo,;
						"Título :"+ aLst[nLoop,02] +"/"+ aLst[nLoop,03] +"/"+ aLst[nLoop,04] +"/"+ aLst[nLoop,05] +Chr(13)+Chr(10)+;
						"Não foi possível obter os dados do título. será desconsiderado.",;
						{"&Continua"},2,;
						"Registro Inválido" )
				Loop
			EndIf

			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Chama a função de impressão do boleto ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			If mv_par21 == 1
				oPrintPvt:=FwmsPrinter():New( "boleto", 6, .t., 'c:\temp\', .T., .F., , , .F., .F., .F., .F., 1)
				oPrintPvt:SetResolution(72)
				oPrintPvt:SetPortrait()
				oPrintPvt:SetPaperSize(DMPAPER_A4)
				oPrintPvt:SetMargin(60, 60, 60, 30)
				oPrintPvt:cPathPDF := "c:\temp\"
			Endif
			
			U_TCImpBol(@oPrintPvt,aDadEmp,aDadBco,aDadTit,aDadCli,aBarra,nTpImp)

			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Grava o arquivo com a imagem do boleto se for e-mail      ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			If mv_par21 == 1
				oPrintPvt:Print() //FM
				_cNameAtu := "c:\temp\boleto.pdf"          
				_cNameTit := Alltrim( SE1->( E1_FILIAL + SubStr( E1_NUM,1, 9 ) + E1_PARCELA  ) )
				_cNewName := "c:\temp\boleto" + _cNameTit + ".pdf"
				fRename( _cNameAtu, _cNewName )
				Cpyt2s( _cNewName, "\dirdoc\boleto\", .f. )
				fErase( _cNewName )
				If aScan( aEnvMail, { |x| Alltrim(x[ 1 ]) == SA1->A1_COD + SA1->A1_LOJA } ) <= 0
					aAdd( aEnvMail, { SA1->A1_COD + SA1->A1_LOJA, { 'boleto' + _cNameTit + '.pdf' }, SA1->A1_ZCOBMAI, '', SA1->A1_COD + '-' + SA1->A1_LOJA + '/' + Alltrim( SA1->A1_NOME ) + ' - ENVIO DE BOLETO DE COBRANÇA' } )
				Else
					aAdd( aEnvMail[ aScan( aEnvMail, { |x| Alltrim(x[ 1 ]) == SA1->A1_COD + SA1->A1_LOJA } ) ][ 2], 'boleto' + _cNameTit + '.pdf' )
				Endif
				oPrintPvt := Nil //FM
			EndIf
			
			DbSelectArea("SE1")
			RecLock("SE1",.F.)
				SE1->E1_NUMBCO	:= aBarra[3]
				If FieldPos("E1_BCOBOL") > 0
					SE1->E1_BCOBOL	:= aDadBco[1]
				Else
					SE1->E1_PORTADO	:= aDadBco[1]
					SE1->E1_AGEDEP	:= aDadBco[3]
					SE1->E1_CONTA	:= aDadBco[5]
				EndIf
			MsUnlock()

		EndIf
	Next nLoop


	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Chama rotina para visualizar o(s) boleto(s) ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If mv_par21 == 1
		lEmBranco := .f.
		If Len( aEnvMail ) > 0
			For _nY := 1 To Len( aEnvMail )
				If !Empty( aEnvMail[ _nY ][ 3 ] )
					_cRecebe  := Alltrim( aEnvMail[ _nY ][ 3 ] ) //+ ', ' + Alltrim( GETMV( "ZP_PAR103" ) )
					If Alltrim(FWCodEmp()) $ "01|03|05|06"
						_cCC := Alltrim( SuperGetMV( "ZP_PARCOBA",.f.,"financeiro3@lahuman.com.br" ) )
					Else
						_cCC := Alltrim( SuperGetMV( "ZP_PARCOBB",.f.,"financeiro@lahuman.com.br;comercial4@lahuman.com.br;multitex.adm@gmail.com" ) )
					EndIf
					_cAssunto := aEnvMail[ _nY ][ 5 ]
					_cMensage := ""
					_cMensage += '<html><body><font face="Arial">'
					_cMensage += "Caro amigo cliente segue anexo boleto(s) de cobrança referente a(s) nota(s) fiscai(s):"
					_cMensage += '<br><br>'
					
					_aAnexo   := {}
					_aAttach  := {}
					_aNfMens  := {}
					For _nX := 1 To Len( aEnvMail[ _nY ][ 2 ] )
					//	aAdd( _aAttach, '\dirdoc\cnab\' + aEnvMail[ _nY ][ 2 ][ _nX ] )
						aAdd( _aAttach, '\dirdoc\boleto\' + aEnvMail[ _nY ][ 2 ][ _nX ] )						
						If aScan( _aNfMens, SubStr( aEnvMail[ _nY ][ 2 ][ _nX ], 13, 9 ) ) == 0
							aAdd( _aNfMens, SubStr( aEnvMail[ _nY ][ 2 ][ _nX ], 13, 9 ) )
						Endif 
					Next
					For _nX := 1 To Len( _aNfMens )
						_cMensage += _aNfMens[ _nX ]
						_cMensage += '<br>
						aAdd(_aAnexo, _aNfMens[ _nX ])
					Next
					_cMensage += '<br><br>'
					_cMensage += 'DEPARTAMENTO FINANCEIRO.'
					_cMensage += '<br><br>'
					_cMensage += 'Direto +55 (19) 3803-9044'
					_cMensage += '<br>'
					_cMensage += 'Tel/WhatsApp +55 (19) 99639-4708'
					_cMensage += '<br><br>'
					_cMensage += 'GRUPO LAHUMAN'
					_cMensage += '<br>'
					_cMensage += '- LAHUMAN IND. E COM. PLASTICOS LTDA. - CNPJ 61.863.130/0001-42'
					_cMensage += '<br>'
					_cMensage += '- BIG FIOS TEXTIL - CNPJ 13.253.759/0001-28'
					_cMensage += '<br>'
					_cMensage += '- MULTI TEXTIL INDUSTRIA E COMERCIO LTDA - CNPJ 49.445.865/0001-50'
					_cMensage += '<br>'		
					_cMensage += '- NEWSAC IND. COM.SACARIA - CNPJ 25.369.730/0001-95'
					_cMensage += '<br>'		
					_cMensage += '- LHJ.E. MANCINO INDUSTRIA COMERCIO, IMP E EXP PLASTICO LTDA - CNPJ 45.632.591/0001-58'
					_cMensage += '<br><br>'																						
					_cMensage += 'AV FUAD ASSEF MALUF 800'
					_cMensage += '<br>'
					_cMensage += 'PARQUE VIRGINIO BASSO - SUMARE - São Paulo'
					_cMensage += '<br>'
					_cMensage += 'CEP 13175-901'
					_cMensage += '<br><br>'
					_cMensage += 'https://www.lahuman.com.br'
					//_cMensage += '<br><br>'
					//_cMensage += 'Essa é uma mensagem automática. Por favor, não responda a este e-mail. Se necessário contato cobranca@fofinho.com.br'
					_cMensage += '</body></html>'
					
					//--> Envio do e-mail		
					u_fSendMail( _cRecebe, _cAssunto, _cMensage, _aAttach, _cCC )

					lEnvioBol := .T.
				Else
					lEmBranco := .t.
				Endif
			Next
		Endif
		If lEmBranco .and. !lJob
			MsgAlert( "Existem clientes sem e-mail de cobrança cadastrado.", "Verifique..." )
		Endif   

		If lEnvioBol .and. !lJob
			MsgAlert( "Boletos de cobrança envidos com sucesso.", "Boletos E-mail" )
		EndIf       
	Else
		//oPrintPvt:Print()
		oPrintPvt:Preview()
	Endif
	//FreeObj(oPrintPvt)
	oPrintPvt := Nil

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Finaliza a chamada da SetPrint ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	MS_FLUSH()

Return(Nil)


/*/{Protheus.doc} CriaSx1
	(Verifica e cria um novo grupo de perguntas)
	@type  Function
	@author Flávio Macieira
	@since 02/08/2021
	@version 1
	/*/

Static Function CriaSx1(aRegs)

	Local aAreaAnt	:= FWGetArea()
	Local aAreaSX1	:= SX1->(FWGetArea())
	Local nJ			:= 0
	Local nY			:= 0

	dbSelectArea("SX1")
	dbSetOrder(1)

	For nY := 1 To Len(aRegs)
		If !MsSeek(aRegs[nY,1]+aRegs[nY,2])
			RecLock("SX1",.T.)
			For nJ := 1 To FCount()
				If nJ <= Len(aRegs[nY])
					FieldPut(nJ,aRegs[nY,nJ])
				EndIf
			Next nJ
			MsUnlock()
		EndIf
	Next nY

	FWRestArea(aAreaSX1)
	FWRestArea(aAreaAnt)

Return(Nil)   


/*/{Protheus.doc} TCDadBco
	(Retorna array com os dados do banco e da empresa)
	@type  Function
	@author Flávio Macieira
	@since 02/08/2021
	@version 1
	/*/

/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±º Autor       ³ Flávio Macieira                                                26.08.13³º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º             ³ ******************************* DIVERSOS ****************************** º±±
±±º             ³ 1. O campo EE_FAXATU deve conter o próximo número do boleto SEM o dígitoº±±
±±º             ³    verificador e no tamanho exato do número definido no manual do banco,º±±
±±º             ³    NÃO deve haver caracteres separadores (.;,-etc...)                   º±±
±±º             ³    Citibank  - 11 posiçoes                                              º±±
±±º             ³    Itaú      - 08 Posições                                              º±±
±±º             ³    Brasil    - 10 Posições                                              º±±
±±º             ³    Bradesco  - 11 Posições                                              º±±
±±º             ³    Santander - 11 Posições                                              º±±
±±º             ³ 2. Carteira  - para definição do código da carteira é utilizado o campo º±±
±±º             ³    EE_CODCART                                                           º±±
±±º             ³                                                                         º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/	
User Function TCDadBco(aDadEmp, aDadBco)

	Local aAreaAtu	:= FWGetArea()
	Local lRet		:= .T.     

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Verifica se passou os parâmetros para a função ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If (aDadEmp == Nil .Or. ValType(aDadEmp) <> "A") .Or. (aDadBco == Nil .Or. ValType(aDadBco) <> "A")
		Aviso(	"Biblioteca de Funções",;
				"Os parâmetros passados por referência estão fora dos padrões."+Chr(13)+Chr(10)+;
				"Verifique a chamada da função no programa de origem.",;
				{"&Continua"},2,;
				"Chamada Inválida" )
		lRet	:= .F.
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Verifica se os arquivos estão posicionados ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If SM0->(Eof()) .Or. SM0->(Bof())
		Aviso(	"Biblioteca de Funções",;
				"O arquivo de Empresas não esta posicionado.",;
				{"&Continua"},,;
				"Registro Inválido" )
		lRet	:= .F.
	EndIf
	If SA6->(Eof()) .Or. SA6->(Bof())
		Aviso(	"Biblioteca de Funções",;
				"O arquivo de Bancos não esta posicionado.",;
				{"&Continua"},,;
				"Registro Inválido" )
		lRet	:= .F.
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Cria array vazio para que não dê erro se não encontrar dados ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	aDadEmp	:= {	"",;	// [1] Nome da Empresa
					"",;	// [2] Endereço
					"",;	// [3] Bairro
					"",;	// [4] Cidade
					"",;	// [5] Estado
					"",;	// [6] Cep
					"",;	// [7] Telefone
					"",;	// [8] Fax
					"",;	// [9] CNPJ
					"" ;	// [10]Inscrição Estadual
					}

	aDadBco	:= {	"",;	// [1] Código do Banco
					"",;	// [2] Dígito do Banco
					"",;	// [3] Código da Agência
					"",;	// [4] Dígito da Agência
					"",;	// [5] Número da Conta Corrente
					"",;	// [6] Dígito da Conta Corrente
					"",;	// [7] Nome Completo do Banco
					"",;	// [8] Nome Reduzido do Banco
					"",;	// [9] Nome do Arquivo com o Logotipo do Banco
					0,;		// [10]Taxa de juros a ser utilizado no cálculo de juros de mora
					0,;		// [11]Taxa de multa a ser impressa no boleto
					0,;		// [12]Número de dias para envio do título ao cartório
					"",;	// [13]Dado para o campo "Uso do Banco"
					"",;	// [14]Dado para o campo "Espécie do Documento"
					"",;	// [15]Código do Cedente
					"" ;    // [16]Contrato banco\Convênio
					}

	If lRet			 
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Alimenta array com os dados da Empresa ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If !Empty(SM0->M0_ENDCOB)
			aDadEmp[2]	:= SM0->M0_ENDCOB
			aDadEmp[3]	:= SM0->M0_BAIRCOB
			aDadEmp[4]	:= SM0->M0_CIDCOB
			aDadEmp[5]	:= SM0->M0_ESTCOB
			aDadEmp[6]	:= SM0->M0_CEPCOB
		Else
			aDadEmp[2]	:= SM0->M0_ENDENT
			aDadEmp[3]	:= SM0->M0_BAIRENT
			aDadEmp[4]	:= SM0->M0_CIDENT
			aDadEmp[5]	:= SM0->M0_ESTENT
			aDadEmp[6]	:= SM0->M0_CEPENT
		EndIf

		aDadEmp[1]	:= SM0->M0_NOMECOM
		aDadEmp[7]	:= SM0->M0_TEL
		aDadEmp[8]	:= SM0->M0_FAX
		aDadEmp[9]	:= SM0->M0_CGC
		aDadEmp[10]	:= SM0->M0_INSC

		
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Alimenta array com os dados do Banco ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If SA6->(FieldPos("A6_DIGBCO")) > 0
			aDadBco[1]	:= SA6->A6_COD
			aDadBco[2]	:= SA6->A6_DIGBCO
		ElseIf Alltrim(SA6->A6_COD) == "001"
			aDadBco[1]	:= SA6->A6_COD
			aDadBco[2]	:= "9" //Space(1)
		ElseIf Alltrim(SA6->A6_COD) $ "341|033"	 
			aDadBco[1]	:= SA6->A6_COD
			aDadBco[2]	:= "7" //Space(1)
		ElseIf Alltrim(SA6->A6_COD) == "237"	 
			aDadBco[1]	:= SA6->A6_COD
			aDadBco[2]	:= "2" //Space(1)
		ElseIf Alltrim(SA6->A6_COD) == "756"	
			aDadBco[1]	:= SA6->A6_COD
			aDadBco[2]	:= "0" //Space(1)
		EndIf

		If SA6->(FieldPos("A6_DVAGE")) > 0
			aDadBco[3]	:= SA6->A6_AGENCIA
			aDadBco[4]	:= SA6->A6_DVAGE //SA6->A6_DIGAGE
		Else
			If At( "-", SA6->A6_AGENCIA ) > 1
				aDadBco[3]	:= SubStr( SA6->A6_AGENCIA, 1, At( "-", SA6->A6_AGENCIA ) - 1 )
				aDadBco[4]	:= SubStr( SA6->A6_AGENCIA, At( "-", SA6->A6_AGENCIA ) + 1, 1 )
			Else
				aDadBco[3]	:= Alltrim(	SA6->A6_AGENCIA	)
				aDadBco[4]	:= ""
			EndIf
		EndIf
		
		If SA6->(FieldPos("A6_DVCTA")) > 0 
			If At( "-", SA6->A6_NUMCON ) > 1   
				aDadBco[5]	:= SubStr( SA6->A6_NUMCON, 1, At( "-", SA6->A6_NUMCON ) - 1)   
				aDadBco[6]	:= SubStr( SA6->A6_NUMCON, At( "-", SA6->A6_NUMCON ) + 1, 1)   
			Else	    
				aDadBco[5]	:= SA6->A6_NUMCON
				aDadBco[6]	:= SA6->A6_DVCTA  //SA6->A6_DIGCON
			EndIf
		Else
			If At( "-", SA6->A6_NUMCON ) > 1
				aDadBco[5]	:= SubStr( SA6->A6_NUMCON, 1, At( "-", SA6->A6_NUMCON ) - 1)
				aDadBco[6]	:= SubStr( SA6->A6_NUMCON, At( "-", SA6->A6_NUMCON ) + 1, 1)
			Else
				aDadBco[5]	:= AllTrim( SA6->A6_NUMCON )
				aDadBco[6]	:= ""
			EndIf
		EndIf

		aDadBco[7]	:= SA6->A6_NOME

		If  AllTrim(SA6->A6_COD) == "001"
			aDadBco[8]	:= "BANCO DO BRASIL SA"   
		ElseIf 	AllTrim(SA6->A6_COD) == "341"
			aDadBco[8]  := "BANCO ITAÚ S.A." 
		ElseIf 	AllTrim(SA6->A6_COD) == "237"
			aDadBco[8]  := "BRADESCO"  
		ElseIf  AllTrim(SA6->A6_COD) == "033" 
			aDadBco[8]	:= "SANTANDER" 
		ElseIf  AllTrim(SA6->A6_COD) == "756" 
			aDadBco[8]	:= "SICOOB" 
		EndIf
				
		If AllTrim(SA6->A6_COD) == "341"
			aDadBco[9]	:= "itau.bmp"
		ElseIf AllTrim(SA6->A6_COD) == "001"
			aDadBco[9]	:= "bb.bmp"	
		ElseIf AllTrim(SA6->A6_COD) == "033"
			aDadBco[9]	:= "Santander.bmp"	  
		ElseIf AllTrim(SA6->A6_COD) == "237"
			aDadBco[9]	:= "Bradesco.bmp"
		ElseIf AllTrim(SA6->A6_COD) == "756"
			aDadBco[9]	:= "sicoob.bmp"	
		EndIf
		
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Define as taxas a serem utilizadas nos cálculos das mensagens ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		aDadBco[10]	:= SuperGetMv("TC_TXJBOL", .F., 0.00)
		aDadBco[11]	:= SuperGetMv("TC_TXMBOL", .F., 0.00)
		aDadBco[12]	:= SuperGetMv("TC_DIABOL", .F., 0)

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Define o campo Para Uso do Banco do boleto ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If SA6->A6_COD $ "745#"
			aDadBco[13]	:= "CLIENTE"
		EndIf

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Define o campo Espécio do Documento do boleto ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If SA6->A6_COD $ "745#"
			aDadBco[14]	:= "DMI"
		ElseIf SA6->A6_COD $ "001#|033"
			aDadBco[14]	:= "DM"
		ElseIf SA6->A6_COD $ "756"
			aDadBco[14]	:= "FAT"
		ElseIf SA6->A6_COD $ "237"
			aDadBco[14]	:= "OU"			
		Else
			aDadBco[14]	:= "NF"
		EndIf
		
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Define o campo da Conta/Cedente do boleto ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If SA6->A6_COD $ "745#"
			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Agência + Conta Cosmos (Código Empresa) ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			aDadBco[15]	:= AllTrim(aDadBco[3])
			If !Empty(aDadBco[4])
				aDadBco[15]	+= "-"+Alltrim(aDadBco[4])
			EndIf
			If !Empty(SEE->EE_CODEMP)
				aDadBco[15]	+= "/"+StrZero(Val(EE_CODEMP),10)
			EndIf
		Else
			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Agência + Conta Corrente ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			aDadBco[15]	:= AllTrim(aDadBco[3])
			aDadBco[16] := SEE->EE_CODEMP
			If !Empty(aDadBco[4])
				aDadBco[15]	+= "-"+Alltrim(aDadBco[4])
			EndIf
			If !Empty(aDadBco[5]) .AND. !SA6->A6_COD $ "033"
				aDadBco[15] += "/"+AllTrim(aDadBco[5])
				If !Empty(aDadBco[6])
					aDadBco[15] += "-"+AllTrim(aDadBco[6])
				EndIf
			Else
				aDadBco[15] += "/"+AllTrim(aDadBco[16])	
			EndIf
		EndIf

	EndIf


	FWRestArea(aAreaAtu)

Return(lRet)


/*/{Protheus.doc} TCDadTit
	(Retorna array com os dados do título e do cliente )
	@type  Function
	@author user
	@since 02/08/2021
	@version 1
	/*/

User Function TCDadTit(aDadTit, aDadCli, aBarra, aDadBco)

	Local aAreaAtu	:= FWGetArea()
	Local lRet		:= .T.
	Local nSaldo	:= 0
	Local cNumDoc	:= ""
	Local cCarteira	:= ""
	Local cMensag1	:= ""
	Local cMensag2	:= ""
	Local cMensag3	:= ""
	Local cMensag4	:= ""
	Local cMensag5	:= ""
	Local cMensag6	:= ""
	Local lSaldo	:= SuperGetMV( "TC_VLRBOL", .F., .T. )

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Verifica se passou os parâmetros para a função ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If (aDadTit == Nil .Or. ValType(aDadTit) <> "A") .Or.;
		(aDadCli == Nil .Or. ValType(aDadCli) <> "A") .Or.;
		(aBarra == Nil .Or. ValType(aBarra) <> "A")
		Aviso(	"Biblioteca de Funções",;
				"Os parâmetros passados por referência estão fora dos padrões."+Chr(13)+Chr(10)+;
				"Verifique a chamada da função no programa de origem.",;
				{"&Continua"},2,;
				"Chamada Inválida" )
		lRet	:= .F.
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Verifica se os arquivos estão posicionados ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If SE1->(Eof()) .Or. SE1->(Bof())
		Aviso(	"Biblioteca de Funções",;
				"O arquivo de Títulos a Receber não esta posicionado.",;
				{"&Continua"},,;
				"Registro Inválido" )
		lRet	:= .F.
	EndIf
	If SA1->(Eof()) .Or. SA1->(Bof())
		Aviso(	"Biblioteca de Funções",;
				"O arquivo de Clientes não esta posicionado.",;
				{"&Continua"},,;
				"Registro Inválido" )
		lRet	:= .F.
	EndIf

	aDadTit	:= {	"",;					// [1] Prefixo do Título
					"",;					// [2] Número do Título
					"",;					// [3] Parcela do Título
					"",;					// [4] Tipo do título
					CToD("  /  /  "),;		// [5] Data de Emissão do título
					CToD("  /  /  "),;		// [6] Data de Vencimento do Título
					CToD("  /  /  "),;		// [7] Data de Vencimento Real
					0,;						// [8] Valor Líquido do Título
					"",;					// [9] Código do Barras Formatado
					"",;					// [10]Carteira de Cobrança
					"",;					// [11]1.a Linha de Mensagens Diversas
					"",;					// [12]2.a Linha de Mensagens Diversas
					"",;					// [13]3.a Linha de Mensagens Diversas
					"",;					// [14]4.a Linha de Mensagens Diversas
					"",;					// [15]5.a Linha de Mensagens Diversas
					"" ;					// [16]6.a Linha de Mensagens Diversas
					}
	aDadCli	:= {	"",;					// [1] Código do cliente
					"",;					// [2] Loja do Cliente
					"",;					// [3] Nome Completo do Cliente
					"",;					// [4] CNPJ do Cliente
					"",;					// [5] Inscrição Estadual do cliente
					"",;					// [6] Tipo de Pessoa do Cliente
					"",;					// [7] Endereço
					"",;					// [8] Bairro
					"",;					// [9] Município
					"",;					// [10] Estado
					"",;					// [11] Cep
					"" ;					// [12] Via de entrega (Correio/Nota)
					}
	aBarra	:= {	"",;					// [1] Código de barras (Banco+"9"+Dígito+Fator+Valor+Campo Livre
					"",;					// [2] Linha Digitável
					"",;					// [3] Nosso Número sem formatação
					"" ;					// [4] Nosso Número Formatado
					}

	If lRet
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Alimenta array com os dados do cliente ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		aDadCli[1]	:= SA1->A1_COD
		aDadCli[2]	:= SA1->A1_LOJA
		aDadCli[3]	:= SA1->A1_NOME
		aDadCli[4]	:= SA1->A1_CGC
		aDadCli[5]	:= SA1->A1_INSCR
		aDadCli[6]	:= SA1->A1_PESSOA
		If !Empty(SA1->A1_ENDCOB)
			If !( "MESMO" $ UPPER( SA1->A1_ENDCOB ) )
				aDadCli[7]	:= SA1->A1_ENDCOB
				aDadCli[8]	:= SA1->A1_BAIRROC
				aDadCli[9]	:= SA1->A1_MUNC
				aDadCli[10]	:= SA1->A1_ESTC
				aDadCli[11]	:= SA1->A1_CEPC
				aDadCli[12]	:= ""//"CORREIO"
			Else
				aDadCli[7]	:= SA1->A1_END
				aDadCli[8]	:= SA1->A1_BAIRRO
				aDadCli[9]	:= SA1->A1_MUN
				aDadCli[10]	:= SA1->A1_EST
				aDadCli[11]	:= SA1->A1_CEP
				aDadCli[12]	:= ""//"CAMINHÃO"

			EndIf
		Else
			aDadCli[7]	:= SA1->A1_END
			aDadCli[8]	:= SA1->A1_BAIRRO
			aDadCli[9]	:= SA1->A1_MUN
			aDadCli[10]	:= SA1->A1_EST
			aDadCli[11]	:= SA1->A1_CEP
			aDadCli[12]	:= ""//"CORREIO"
		Endif

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Monta o saldo do título ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If lSaldo
			nSaldo	:= SE1->E1_SALDO
		Else
			nSaldo	:= SE1->E1_VALOR
		EndIf
		nSaldo	-= SomaAbat(SE1->E1_PREFIXO,SE1->E1_NUM,SE1->E1_PARCELA,"R",1,,SE1->E1_CLIENTE,SE1->E1_LOJA)
		nSaldo	-= SE1->E1_DECRESC
		nSaldo	+= SE1->E1_ACRESC

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Pega ou monta o nosso número ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ

		If !Empty(SE1->E1_NUMBCO)
			cNumDoc	:= AllTrim(SE1->E1_NUMBCO)
		Else
			dbSelectArea("SEE")
			RecLock("SEE",.F.)
				nTamFax	:= Len(AllTrim(SEE->EE_FAXATU))
				cNumDoc	:= StrZero(Val(Alltrim(SEE->EE_FAXATU)),nTamFax)
				SEE->EE_FAXATU	:= Soma1(cNumDoc,nTamFax)
			MsUnLock()
		EndIf
		
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Define a carteira de cobrança ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If Empty(SEE->EE_CODCART)
			cCarteira	:= "109"
		Else
			cCarteira	:= SEE->EE_CODCART
		EndIf

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Monta o Código de Barras e Linha Digitável ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		aBarra	:= GetBarra(	aDadBco[1],;
								aDadBco[3],;
								aDadBco[4],;
								aDadBco[5],;
								aDadBco[6],;
								cCarteira,;
								cNumDoc,;
								nSaldo,;
								SE1->E1_VENCTO,;
								SEE->EE_CODEMP,;
								SE1->E1_PARCELA,;
								SEE->EE_AGEOFI;
								)

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Taxa de juros a ser utilizado no cálculo de juros de mora ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		/*
		If !Empty(aDadBco[10])
			cMensag1	:= "Mora Diária de R$ "+AllTrim(Transform( Round( ( nSaldo * (aDadBco[10]/100) ) / 30, 2), "@E 999,999,999.99"))
		Endif
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Taxa de multa a ser impressa no boleto ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If !Empty(aDadBco[11])
			cMensag2	:= "Multa por atraso no pagamento - " + AllTrim(Transform( aDadBco[11], "@E 999,999.99%"))
		EndIf
		*/
	/*
		
		cMensag1 := "Multa de 10% após o vencimento."
		cMensag2 := "Juros de 5% ao mês pro rata após o vencimento."
	*/
		cMensag1 := "Sujeito a protesto após 3 dias do vencimento"
		cMensag2 := "Apos vencimento, cobrar juros de " + AllTrim(Transform( Round( (nSaldo * 0.02)/30 , 2), "@E 999,999,999.99"))
		cMensag3 := "Apos vencimento, cobrar multa de " + AllTrim(Transform( Round( nSaldo * 0.01 , 2), "@E 999,999,999.99"))//DToC(nSaldo)
	//	cMensag1 := "MULTA DE 1,0000 % A PARTIR DE " + DToC(SE1->E1_VENCREA)
		
	//	cMensag2 := "MORA DE "+ AllTrim(Transform( Round( nSaldo * 0.0016665 , 2), "@E 999,999,999.99"))+" AO DIA A PARTIR DE " + DToC(SE1->E1_VENCREA)
		
		
		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Número de dias para envio do título ao cartório ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If !Empty(aDadBco[12])
		//	cMensag3	:= "Sujeito a Protesto após " + StrZero(aDadBco[12], 2) + " (" + AllTrim(Extenso(aDadBco[12],.T.)) + ") dias do vencimento."
		EndIf

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Alimenta array com os dados do título ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		aDadTit[1]	:= SE1->E1_PREFIXO		// [1] Prefixo do Título
		aDadTit[2]	:= SE1->E1_NUM			// [2] Número do Título
		aDadTit[3]	:= SE1->E1_PARCELA		// [3] Parcela do Título
		aDadTit[4]	:= SE1->E1_TIPO			// [4] Tipo do título
		aDadTit[5]	:= SE1->E1_EMISSAO		// [5] Data de Emissão do título
		aDadTit[6]	:= SE1->E1_VENCTO		// [6] Data de Vencimento do Título
		aDadTit[7]	:= SE1->E1_VENCREA		// [7] Data de Vencimento Real
		aDadTit[8]	:= nSaldo				// [8] Valor Líquido do Título
		aDadTit[9]	:= aBarra[4]			// [9] Código do Barras Formatado
		aDadTit[10]	:= cCarteira			// [10]Carteira de Cobrança
		aDadTit[11]	:= cMensag1				// [11]1a. Linha de Mensagem diversas
		aDadTit[12]	:= cMensag2				// [11]2a. Linha de Mensagem diversas
		aDadTit[13]	:= cMensag3				// [11]3a. Linha de Mensagem diversas
		aDadTit[14]	:= cMensag4				// [11]4a. Linha de Mensagem diversas
		aDadTit[15]	:= cMensag5				// [11]5a. Linha de Mensagem diversas
		aDadTit[16]	:= cMensag6				// [11]6a. Linha de Mensagem diversas
	EndIf

				
	FWRestArea(aAreaAtu)

Return(lRet)




/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÉÍÍÍÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ»±±
±±º Programa    ³ GetBarra ³ Cálcula o código de barras, linha digitável e dígito do      º±±
±±º             ³          ³ nosso número                                                 º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Autor       ³ 20.01.07 ³                                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Parâmetros  ³ ExpC1 = Código do Banco                                                 º±±
±±º             ³ ExpC2 = Número da Agência                                               º±±
±±º             ³ ExpC3 = Dígito da Agência                                               º±±
±±º             ³ ExpC4 = Número da Conta Corrente                                        º±±
±±º             ³ ExpC5 = Dígito da Conta Corrente                                        º±±
±±º             ³ ExpC6 = Carteira                                                        º±±
±±º             ³ ExpC7 = Nosso Número sem dígito                                         º±±
±±º             ³ ExpN1 = Valor do Título                                                 º±±
±±º             ³ ExpD1 = Data de Vencimento                                              º±±
±±º             ³ ExpC8 = Número do Contrato                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Retorno     ³ ExpL1 = .T. montou os arrays corretamento, .F. não montou os arrays     º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Observações ³ Os arquivos devem estar posicionados SE1, SA1, SEE, SA6                 º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Alterações  ³ 99.99.99 - Consultor - Descrição da alteração                           º±±
±±º             ³                                                                         º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
Static Function GetBarra(cBanco,cAgencia,cDigAgencia,cConta,cDigConta,cCarteira,cNNum,nValor,dVencto,cContrato,nParc,cCeden)

	Local cValorFinal	:= StrZero(Int(NoRound(nValor*100)),10)
	Local cDvCB			:= 0
	Local cDv			:= 0
	Local cNN			:= ""
	Local cNNForm		:= ""
	Local cRN			:= ""
	Local cCB			:= ""
	Local cS			:= ""
	Local cDvNN			:= "" 
	Local cContra		:= "" 
	Local cFator		:= StrZero(dVencto - CToD("07/10/97"),4)
	Local cCpoLivre		:= Space(25)

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³                 Definicao do NOSSO NÚMERO E CAMPO LIVRE                 ³

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ BRASIL                                                                  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If cBanco $ "001"
		If Len(AllTrim(cContrato)) > 6
			Cs		:= AllTrim(cContrato) + cNNum + cCarteira
		Else
			Cs		:= "000000" + AllTrim(cContrato) + cNNum + cCarteira
		EndIf
		cDvNN		:= U_TCCalcDV( cBanco, cS )		//Modulo11(cS)
		cNN			:= AllTrim(cContrato) + cNNum + cDvNN
		cNNForm		:= AllTrim(cContrato) + cNNum
	//	cNNForm		:= AllTrim(cContrato) + cNNum + "-" + cDvNN
		cCpoLivre	:= ""
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ BRADESCO                                                                ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	ElseIf 	cBanco $ "237"
		cS			:= AllTrim(cCarteira) + cNNum
		cDvNN		:= U_TCCalcDV( cBanco, cS )			//Mod11237(cS)
		cNN			:= AllTrim(cCarteira) + cNNum + cDvNN
	//	cNNForm		:= AllTrim(cCarteira) + "/"+ Substr(cNNum,1,2)+"/"+Substr(cNNum,3,9) + "-" + cDvnn
		cNNForm		:= AllTrim(cCarteira) + "/"+ Substr(cNNum,1,2)+Substr(cNNum,3,9) + "-" + cDvnn
		cCpoLivre	:= StrZero(Val(AllTrim(cAgencia)),4)+StrZero(Val(AllTrim(cCarteira)),2)+cNNum+StrZero(Val(AllTrim(cConta)),7)+"0"
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ ITAÚ                                                                    ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	ElseIf cBanco $ "341"
		If cCarteira $ "126/131/146/150/168"
			cS			:=  AllTrim(cCarteira) + cNNum
		Else
			cS			:=  AllTrim(cAgencia) + AllTrim(cConta) + AllTrim(cCarteira) + cNNum
		EndIf
		cDvNN		:= U_TCCalcDV( cBanco, cS )			//Modulo10(cS)
		cNN			:= AllTrim(cCarteira) + cNNum + cDvNN
		cNNForm		:= AllTrim(cCarteira) + "/"+ cNNum + "-" + cDvNN
		cCpoLivre	:= StrZero(Val(AllTrim(cCarteira)),3)+cNNum+cDvNN+StrZero(Val(Alltrim(cAgencia)),4)+StrZero(Val(AllTrim(cConta)),5)+cDigConta+"000"
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ CITIBANK                                                                ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	ElseIf cBanco $ "745"
		cS			:= cNNum
		cDvNN		:= U_TCCalcDV( cBanco, cS )			//modulo11(cS)
		cNN			:= cNNum + cDvNN
		cNNForm		:= cNNum + "-" + cDvNN
		cCpoLivre	:= "3" + StrZero(Val(cCarteira),3) + SubStr(AllTrim(cContrato), 2, 9) + cNN  
		
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Santander                                                               ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ	
	ElseIf cBanco $ "033"
		cCart	:= Alltrim(SEE->EE_CODCART)
		cContra	:= Alltrim(SEE->EE_CODEMP)
		cS		:=  cCart + cNNum  
		cS		:=  cNNum  
		cDvnn	:= u_mod11033(cS)
		cNN		:= cCart + cNNum + '-' + cDvnn  
		cNNForm	:= cCart + "/"+ cNNum + "-" +cDvnn 

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Sicoob		                                                           ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	ElseIf cBanco $ "756"
		cS 			:= StrZero(Val(AllTrim(cCeden)),4)+StrZero(Val(AllTrim(cContrato)),10)+StrZero(Val(AllTrim(cNNum)),7)
		cDvNN		:= U_TCCalcDV( cBanco, cS )			//modulo11(cS)
		cNN			:= cNNum + cDvNN
		cNNForm		:= cNNum + "-" + cDvNN
		cCpoLivre	:= StrZero(Val(Alltrim(cCarteira)),1)+StrZero(Val(AllTrim(cAgencia)),4)+"01"+StrZero(Val(AllTrim(cConta)),6)+cDigConta+cNN+nParc

	EndIf
		
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³                  Definicao do DÍGITO CODIGO DE BARRAS                   ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If cBanco $ "001"
		cS		:= cBanco+"9"+cFator+cValorFinal+"000000"+Left(AllTrim(cNN),17)+AllTrim(cCarteira)
		cDvCB	:= Modulo11(cS) 
		
	ElseIf cBanco $ "033"
		cCpoLivre	:= cAgencia+Substr(cCart,1,2)+cNNum +StrZero(Val(cConta),8)+"0"                                                                                                                                   
		cCpoLivre	:= "9"+cContra+Strzero(val(cNNum),12)+AllTrim(cDvnn)+"0101"
	//	cCpoLivre	:= "91327283"+Strzero(val(cNNum),12)+AllTrim(cDvnn)+"0101"
		
	Else
		cS		:= cBanco+"9"+cFator+cValorFinal+cCpoLivre
		cDvCB	:= Modulo11(cS)
	EndIf

	If cBanco $ "001"
		cCB	:= cBanco+"9"+cDVCB+cFator+cValorFinal+"000000"+Left(AllTrim(cNN),17)+AllTrim(cCarteira) 

	ElseIf cBanco $ "033"
		cS	:= cBanco+"9"+" "+cFator+cValorFinal+cCpoLivre
		nDvCb   := Modulo11a(Substr(cS,1,4)+Substr(cS,6,39))
		cCB	:= cBanco+"9"+STR(nDVCb,1)+cFator+cValorFinal+cCpoLivre
	Else
		cCB	:= cBanco+"9"+cDVCB+cFator+cValorFinal+cCpoLivre
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³                  Definicao da LINHA DIGITÁVEL                           ³
	//³ Campo 1       Campo 2        Campo 3        Campo 4   Campo 5           ³
	//³ AAABC.CCCCX   CCCCC.CCCCCY   CCCCC.CCCCCZ   W	      UUUUVVVVVVVVVV    ³
	//³ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ³
	//³ AAA                       = Código do Banco na Câmara de Compensação    ³
	//³ B                         = Código da Moeda, sempre 9                   ³
	//³ CCCCCCCCCCCCCCCCCCCCCCCCC = Campo Livre                                 ³
	//³ X                         = Digito Verificador do Campo 1               ³
	//³ Y                         = Digito Verificador do Campo 2               ³
	//³ Z                         = Digito Verificador do Campo 3               ³
	//³ W                         = Digito Verificador do Codigo de Barras      ³
	//³ UUUU                      = Fator de Vencimento                         ³
	//³ VVVVVVVVVV                = Valor do Título                             ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ CALCULO DO DÍGITO VERIFICADOR DO CAMPO 1                                ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If cBanco $ "001|033"
		cS		:= cBanco + "9" +Substr(cCB,20,5)
		cDv		:= modulo10(cS)
		cRN1	:= SubStr(cS, 1, 5) + "." + SubStr(cS, 6, 4) + cDv  
	Else
		cS		:= cBanco + "9" +Substr(cCpoLivre,1,5)
		cDv		:= modulo10(cS)
		cRN1	:= SubStr(cS, 1, 5) + "." + SubStr(cS, 6, 4) + cDv
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ CALCULO DO DÍGITO VERIFICADOR DO CAMPO 2                                ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If cBanco $ "001"
		cS		:= Substr(cCB,25,10)
		cDv		:= modulo10(cS)
		cRN2	:= cS + cDv
		cRN2	:= SubStr(cS, 1, 5) + "." + Substr(cS, 6, 5) + cDv 
	ElseIf cBanco $ "033"
		cS   := Substr(cCpoLivre,6,10)
		cDv  := modulo10(cS)
		cRN2 := cS + Alltrim(cDv)
		cRN2 := Substr(cRN2,1,5)+"."+Substr(cRN2,6,6)	
	Else
		cS		:= Substr(cCpoLivre,6,10)
		cDv		:= modulo10(cS)
		cRN2	:= cS + cDv
		cRN2	:= SubStr(cS, 1, 5) + "." + Substr(cS, 6, 5) + cDv
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ CALCULO DO DÍGITO VERIFICADOR DO CAMPO 3                                ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If cBanco $ "001"
		cS		:= Substr(cCB,35,10)
		cDv		:= modulo10(cS)
		cRN3	:= SubStr(cS, 1, 5) + "." + Substr(cS, 6, 5) + cDv 
	ElseIf cBanco $ "033"
		cS    := Substr(cCpoLivre,16,10)
		cDv   := modulo10(cS)
		cRN3  := cS + Alltrim(cDv)              
		cRN3  := Substr(cS,1,5)+"."+Substr(cRN3,6,6)	
	Else
		cS		:= Substr(cCpoLivre,16,10)
		cDv		:= modulo10(cS)
		cRN3	:= SubStr(cS, 1, 5) + "." + Substr(cS, 6, 5) + cDv
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ CALCULO DO CAMPO 4                                                      ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If cBanco $ "033"
		cRN4   := Substr(cCb,5,1)
	Else	
		cRN4	:= cDvCB
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ CALCULO DO CAMPO 5                                                      ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	cRN5	:= cFator + cValorFinal

	cRN		:= cRN1 + " " + cRN2 + ' '+ cRN3 + ' ' + cRN4 + ' ' + cRN5

Return({cCB,cRN,cNNum,cNNForm,cDvNN})


/*/{Protheus.doc} TCCalcDV
	(Efetua o cálculo do dígito verificador do nosso número)
	@type  Function
	@author user
	@since 02/08/2021
	@version 1
	/*/

User Function TCCalcDV( cBanco, cNNum )

	Local cRetorno	:= ""

	Default cBanco := ""
	Default cNNum  := ""

	If cBanco $ "001#745#756"
		cRetorno	:= Modulo11( cNNum )
	ElseIf cBanco $ "237"
		cRetorno	:= Mod11237( cNNum )
	ElseIf cBanco $ "341"
		cRetorno	:= Modulo10( cNNum ) 
	ElseIf cBanco $ "033"
		cRetorno    := Mod11033( cNNum )
	EndIf

Return( cRetorno )




/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÉÍÍÍÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ»±±
±±º Programa    ³ Modulo10 ³ Efetua o cálculo do dígito veririficador com base 10         º±±
±±º             ³          ³                                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Autor       ³ 23.01.07 ³                                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Parâmetros  ³ ExpC1 = String com o código a ser calculado                             º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Retorno     ³ ExpC1 = String com o Dígito Verificador                                 º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Observações ³                                                                         º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Alterações  ³ 99.99.99 - Consultor - Descrição da alteração                           º±±
±±º             ³                                                                         º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
Static Function Modulo10(cData)

	Local L	:= Len(cData)
	Local D	:= 0
	Local P := 0
	Local B	:= .T.

	While L > 0
		P := Val(SubStr(cData, L, 1))
		If (B)
			P := P * 2
			If P > 9
				P := P - 9
			EndIf
		EndIf
		D := D + P
		L := L - 1
		B := !B
	EndDo
	D := 10 - (Mod(D,10))
	If D = 10
		D := 0
	EndIf

Return(AllTrim(Str(D,1)))



/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÉÍÍÍÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ»±±
±±º Programa    ³ Modulo11 ³ Efetua o cálculo do dígito veririficador com base 11         º±±
±±º             ³          ³                                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Autor       ³ 23.01.07 ³                                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Parâmetros  ³ ExpC1 = String com o código a ser calculado                             º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Retorno     ³ ExpC1 = String com o Dígito Verificador                                 º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Observações ³                                                                         º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Alterações  ³ 99.99.99 - Consultor - Descrição da alteração                           º±±
±±º             ³                                                                         º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
Static Function Modulo11(cData)

	Local L	:= Len(cData)
	Local D	:= 0
	Local P	:= 1

	While L > 0
		P := P + 1
		D := D + (Val(SubStr(cData, L, 1)) * P)
		If P = 9
			P := 1
		EndIf
		L := L - 1
	EndDo
	D := 11 - (mod(D,11))
	If (D == 0 .Or. D == 1 .Or. D == 10 .Or. D == 11)
		D := 1
	EndIf

Return(AllTrim(Str(D,1)))



/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÉÍÍÍÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ»±±
±±º Programa    ³ Mod11237 ³ Efetua o cálculo do dígito veririficador com base 7 Bradesco º±±
±±º             ³          ³                                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Autor       ³ 23.01.07 ³                                                              º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Parâmetros  ³ ExpC1 = String com o código a ser calculado                             º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Retorno     ³ ExpC1 = String com o Dígito Verificador                                 º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Observações ³                                                                         º±±
±±ÌÍÍÍÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±º Alterações  ³ 99.99.99 - Consultor - Descrição da alteração                           º±±
±±º             ³                                                                         º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
Static Function Mod11237(cData)

	Local nResult	:= 0
	Local nSoma		:= 0
	Local i			:= 0
	Local nTam		:= 13
	Local nDc		:= 0
	Local nAlg		:= 2
	Local nCalNum	:= space(13)

	nCalNum:= cData

	For i  := nTam To 1 Step -1
		nSoma   := Val(Substr(nCalNum,i,1))*nAlg
		nResult := nResult + nSoma
		nAlg    := nAlg + 1   
		If nAlg > 7
			nAlg := 2
		Endif
	Next i

	nDC  := MOD(nResult,11)   
	cDig := 11 - nDc

	IF nDC == 1
		cDig := "P"
	ElseIf nDC == 0
	cDig := 0
	cDig := STR(cDig,1) 	
	Else
		cDig := STR(cDig,1)
	EndIF
  
Return(Alltrim(cDig))  


/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÉÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍËÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍËÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍ»±±
±±ºPrograma  Modulo11a  ³         Flávio Macieira    º Data ³  09/05/13   º±±
±±ÌÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÊÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÊÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±ºDesc.     ³  Dig codigo barra Santander                                º±±
±±º          ³                                                            º±±
±±ÌÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±ºUso       ³ AP                                                        º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
Static Function Modulo11a(cData)  

	Local nResult:= 0
	Local nSoma  := 0
	Local i      := 0
	Local nTam   := Len(cData)
	Local nDc    := 0
	Local nAlg   := 2

	nCalNum:= cData

	For i  := nTam To 1 Step -1
		nSoma   := Val(Substr(nCalNum,i,1))*nAlg
		nResult := nResult + nSoma
		nAlg    := nAlg + 1   
		If nAlg > 9
			nAlg := 2
		Endif
	Next i

	nResult = nResult*10

	nDC  := MOD(nResult,11)   
	cDig := nDc

	If cDig == 0 .Or. cDig == 1 .or. cDig > 9   
	cDig := 1
	EndIf

Return(cDig)


/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÉÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍËÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍËÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍ»±±
±±ºPrograma  Mod11033           ³Flávio Macieira     º Data ³  09/05/13   º±±
±±ÌÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÊÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÊÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±ºDesc.     ³ modulo 11 com base 7 para Santander                        º±±
±±º          ³                                                            º±±
±±ÌÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±ºUso       ³ AP                                                        º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
User Function Mod11033(cData) // modulo 11 com base 7 para Santander              

	Local nResult:= 0
	Local nSoma  := 0
	Local i      := 0
	Local nTam   := 13
	Local nDc    := 0
	Local nAlg   := 2
	Local nCalNum:= space(13)

	nCalNum:= cData

	For i  := nTam To 1 Step -1
		nSoma   := Val(Substr(nCalNum,i,1))*nAlg
		nResult := nResult + nSoma
		nAlg    := nAlg + 1   
		If nAlg > 7
			nAlg := 2
		Endif
	Next i

	nDC  := MOD(nResult,11)   
	cDig := 11 - nDc

	IF nDC == 1
		cDig := "0" //"P"
	ElseIf nDC == 0
	cDig := 0
	cDig := STR(cDig,1) 	
	Else
		cDig := STR(cDig,1)
	EndIF
  
Return(Alltrim(cDig))  


/*/{Protheus.doc} TCImpBol
	(Efetua a impressão do boleto bancário )
	@type  Function
	@author user
	@since 02/08/2021
	@version 1
	/*/

User Function TCImpBol(oPrintPvt,aDadEmp,aDadBco,aDadTit,aDadCli,aBarra,nTpImp)

	Local oFont8
	Local oFont10
	Local oFont11c
	Local oFont14
	Local oFont14n
	Local oFont15
	Local oFont15n
	Local oFont16n
	Local oFont20
	Local oFont21
	Local oFont24
	Local nLin       := -040
	Local nLoop		 := 0
	Local cBmp		 := ""
	Local cStartPath := AllTrim(GetSrvProfString("StartPath",""))

	If Right(cStartPath,1) <> "\"
		cStartPath+= "\"
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Monta string com o caminho do logotipo do banco ³
	//³ O Tamanho da figura tem que ser 381 x 68 pixel  ³
	//³ para que a impressãi sai correta                ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	cBmp	:= cStartPath+aDadBco[9]

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Define as fontes a serem utilizadas ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	oFont8		:= TFont():New("Arial",			9,08,.T.,.F.,5,.T.,5,.T.,.F.)
	oFont10		:= TFont():New("Arial",			9,10,.T.,.T.,5,.T.,5,.T.,.F.)
	oFont11c	:= TFont():New("Courier New",	9,11,.T.,.T.,5,.T.,5,.T.,.F.)
	oFont14		:= TFont():New("Arial",			9,14,.T.,.T.,5,.T.,5,.T.,.F.)
	oFont14n	:= TFont():New("Arial",			9,14,.T.,.F.,5,.T.,5,.T.,.F.)
	oFont15		:= TFont():New("Arial",			9,15,.T.,.T.,5,.T.,5,.T.,.F.)
	oFont15n	:= TFont():New("Arial",			9,15,.T.,.F.,5,.T.,5,.T.,.F.)
	oFont16n	:= TFont():New("Arial",			9,16,.T.,.F.,5,.T.,5,.T.,.F.)
	oFont20		:= TFont():New("Arial",			9,20,.T.,.T.,5,.T.,5,.T.,.F.)
	oFont21		:= TFont():New("Arial",			9,21,.T.,.T.,5,.T.,5,.T.,.F.)
	oFont24		:= TFont():New("Arial",			9,24,.T.,.T.,5,.T.,5,.T.,.F.)

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Inicia uma nova página ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ 
	oPrintPvt:StartPage()

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Define o Primeiro Bloco - Recibo de Entrega ³ - 
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ   
	/*
	oPrintPvt:Line	(nLin+0150,0500,nLin+0070,0500)															// Quadro
	oPrintPvt:Line	(nLin+0150,0710,nLin+0070,0710)												   			// Quadro

	If !Empty(aDadBco[9])
		oPrintPvt:SayBitMap(nLin+0084,0100,cBmp,350,060)													// Logotipo do Banco
	Else
		oPrintPvt:Say	(nLin+0084,0100,	aDadBco[8],											oFont14)	// Nome do Banco
	EndIf
		oPrintPvt:Say	(nLin+0135,0513,	aDadBco[1]+"-"+aDadBco[2],								oFont21)	// Número do Banco + Dígito

		oPrintPvt:Say	(nLin+0144,1900,	"Comprovante de Entrega",								oFont10)	// Texto Fixo
	oPrintPvt:Line	(nLin+0150,0100,nLin+0150,2300)															// Quadro

		oPrintPvt:Say  (nLin+0170,0100,	"Beneficiário",		    									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0220,0100,	aDadEmp[1],												oFont10)	// Nome da Empresa

		oPrintPvt:Say  (nLin+0170,1060,	"Agência/Código Beneficiário",   							oFont8)		// Texto Fixo
		If aDadBco[1] == '001'
			_xAgeAju := SubStr( aDadBco[3], 1, Len( aDadBco[3] ) - 1 ) + '-' + SubStr( aDadBco[3], Len( aDadBco[3] ), 1 )
			_xConAju := Alltrim( Str( Val( aDadBco[5] ) ) )
			_xConAju := SubStr( _xConAju, 1, Len( _xConAju ) - 1 ) + '-' + SubStr( _xConAju, Len( _xConAju ), 1 )
			oPrintPvt:Say  (nLin+0220,1110,	_xAgeAju + ' / ' + _xConAju,							oFont10)	// Agencia + Cód.Beneficiário
		Else
			oPrintPvt:Say  (nLin+0220,1110,	AllTrim(aDadBco[15]),									oFont10)	// Agencia + Cód.Beneficiário
		Endif

		oPrintPvt:Say  (nLin+0170,1510,	"Nro.Documento",										oFont8)		// Texto fixo
		oPrintPvt:Say  (nLin+0220,1560,	aDadTit[1]+aDadTit[2]+aDadTit[3],						oFont10)	// Prefixo + Numero + Parcela

		oPrintPvt:Say  (nLin+0270,0100,	"Pagador",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0320,0100,	aDadCli[3],												oFont10)	// Nome do Cliente

		oPrintPvt:Say  (nLin+0270,1060,	"Vencimento",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0320,1110,	DToC(aDadTit[6]),										oFont10)	// Data de Vencimento

		oPrintPvt:Say  (nLin+0270,1510,	"Valor do Documento",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0320,1560,	Transform(aDadTit[8],"@E 9999,999,999.99"),				oFont10)	// Valor do Título

		oPrintPvt:Say  (nLin+0420,0100,	"Recebi(emos) o bloqueto/título",						oFont10)	// Texto Fixo
		oPrintPvt:Say  (nLin+0470,0100,	"com as características acima.",						oFont10)	// Texto Fixo
		oPrintPvt:Say  (nLin+0370,1060,	"Data",													oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0370,1410,	"Assinatura",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0470,1060,	"Data",													oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0470,1410,	"Entregador",											oFont8)		// Texto Fixo

	oPrintPvt:Line (nLin+0250,0100,nLin+0250,1900 )														// Quadro
	oPrintPvt:Line (nLin+0350,0100,nLin+0350,1900 )														// Quadro
	oPrintPvt:Line (nLin+0450,1050,nLin+0450,1900 )														// Quadro
	oPrintPvt:Line (nLin+0550,0100,nLin+0550,2300 )														// Quadro

	oPrintPvt:Line (nLin+0550,1050,nLin+0150,1050 )														// Quadro
	oPrintPvt:Line (nLin+0550,1400,nLin+0350,1400 )														// Quadro
	oPrintPvt:Line (nLin+0350,1500,nLin+0150,1500 )														// Quadro
	oPrintPvt:Line (nLin+0550,1900,nLin+0150,1900 )														// Quadro

		oPrintPvt:Say  (nLin+0185,1910,	"(  ) Mudou-se",										oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0225,1910,	"(  ) Ausente",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0265,1910,	"(  ) Não existe nº indicado",							oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0305,1910,	"(  ) Recusado",			 							oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0345,1910,	"(  ) Não procurado",		 							oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0385,1910,	"(  ) Endereço insuficiente",							oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0425,1910,	"(  ) Desconhecido",		 							oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0465,1910,	"(  ) Falecido",										oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0505,1910,	"(  ) Outros(anotar no verso)",							oFont8)		// Texto Fixo
	*/
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Pontilhado separador ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	//nLin+= 0200
	nLin  += 0050
	For nLoop := 100 to 2300 Step 50
		oPrintPvt:Line(nLin+0580, nLoop,nLin+0580, nLoop+30)												// Linha pontilhada
	Next nI

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Define o Segundo Bloco - Recibo do Pagador ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ

	If Alltrim(SA6->A6_COD)$ "001"
		oPrintPvt:Line (nLin+0710,0100,nLin+0710,2300)														// Quadro
		oPrintPvt:Line (nLin+0710,0500,nLin+0630,0500)														// Quadro
		oPrintPvt:Line (nLin+0710,0710,nLin+0630,0710)														// Quadro

		If !Empty(aDadBco[9])
			oPrintPvt:SayBitMap(nLin+0644,0100,cBmp,350,060)													// Logotipo do Banco
		Else
			oPrintPvt:Say  (nLin+0644,0100,	aDadBco[8],											oFont14)	// Nome do Banco
		EndIf
		oPrintPvt:Say  (nLin+0695,0513,	aDadBco[1]+"-"+aDadBco[2],								oFont21)	// Numero do Banco + Dígito
		oPrintPvt:Say  (nLin+0620,1900,	"Recibo do Pagador",									oFont10)

		oPrintPvt:Line (nLin+0850,0100,nLin+0850,2300)				// Quadro
		oPrintPvt:Line (nLin+0920,0100,nLin+0920,2300)				// Quadro
		oPrintPvt:Line (nLin+1050,0100,nLin+1050,2300)				// Quadro

		oPrintPvt:Line (nLin+0850,0500,nLin+0920,0500)				// Quadro
		oPrintPvt:Line (nLin+0850,1000,nLin+0920,1000)				// Quadro
		oPrintPvt:Line (nLin+0850,1500,nLin+0920,1500)				// Quadro
		oPrintPvt:Line (nLin+0850,2000,nLin+0920,2000)				// Quadro

		oPrintPvt:Say  (nLin+0730,0100 ,	"Nome do Pagador/CPF/CNPJ/Endereço",		oFont8)		// Texto Fixo  
		oPrintPvt:Say  (nLin+0840,0100,	"Sacador/Avalista",	                		oFont8)	
		oPrintPvt:Say  (nLin+0865,0100,	"Nosso Número",								oFont8)
		oPrintPvt:Say  (nLin+0865,0510,	"Nr. Documento",							oFont8)
		oPrintPvt:Say  (nLin+0865,1010,	"Data de Vencimento",						oFont8)
		oPrintPvt:Say  (nLin+0865,1510,	"Valor do Documento",						oFont8)
		oPrintPvt:Say  (nLin+0865,2010,	"(=)Valor Pago",							oFont8)
		oPrintPvt:Say  (nLin+0935,0100 ,	"Nome do Beneficiário/CPF/CNPJ/Endereço",	oFont8)
		oPrintPvt:Say  (nLin+1065,0100 ,	"Agência/Código do Beneficiário",			oFont8)
		oPrintPvt:Say  (nLin+1065,1550 ,	"Autenticação Mecânica",					oFont8)

		oPrintPvt:Say  (nLin+0970,0100,	AllTrim(aDadEmp[1])+ " - CNPJ: "+Transform(aDadEmp[9], "@R 99.999.999/9999-99"), oFont10)	// Nome + CNPJ
		oPrintPvt:Say  (nLin+0990,0100,	AllTrim(aDadEmp[2])+ " - CEP: "+Transform(aDadEmp[6], "@R 99999-999") + " - "+Alltrim(aDadEmp[4])+ " - " + aDadEmp[5], oFont10)	// CEP + Cidade + Estado
		oPrintPvt:Say  (nLin+1040,0100,	AllTrim(aDadBco[15]),					oFont11c)	// Agencia + Cód.Beneficiário + Dígito
		oPrintPvt:Say  (nLin+0900,0100,	aBarra[4],								oFont11c) //Nosso Numero

		oPrintPvt:Say  (nLin+0900,1010,	StrZero(Day(aDadTit[6]),2) +"/"+;
										StrZero(Month(aDadTit[6]),2) +"/"+; 
										StrZero(Year(aDadTit[6]),4),			oFont11c)	// Vencimento

		oPrintPvt:Say  (nLin+0900,0510,	Alltrim(aDadTit[2]) + aDadTit[3],	oFont11c)	// Prefixo + Numero + Parcela
		oPrintPvt:Say  (nLin+0900,1510,	Transform(aDadTit[8],"@E 9999,999,999.99"),	oFont11c)	// Valor do Título
		
		oPrintPvt:Say  (nLin+0756,0100,	aDadCli[3] + "- CNPJ: "+Transform(aDadCli[4],"@R 99.999.999/9999-99"), oFont11c); //, oFont11)	// Nome do Cliente

		oPrintPvt:Say  (nLin+0779,0100,	AllTrim(aDadCli[7])+" "+AllTrim(aDadCli[8])+ " "+"CEP - "+Transform(aDadCli[11],"@R 99999-999")+" - "+ AllTrim(aDadCli[9])+" - "+ AllTrim(aDadCli[10]), oFont11c)	// Endereço + Bairro + CEP + Cidade+ Estado
		oPrintPvt:Say  (nLin+0695,0755,	aBarra[2],	oFont15n)	// Linha Digitavel do Codigo de Barras

	Else
		oPrintPvt:Line (nLin+0710,0100,nLin+0710,2300)														// Quadro
		oPrintPvt:Line (nLin+0710,0500,nLin+0630,0500)														// Quadro
		oPrintPvt:Line (nLin+0710,0710,nLin+0630,0710)														// Quadro

		If !Empty(aDadBco[9])
			oPrintPvt:SayBitMap(nLin+0644,0100,cBmp,350,060)													// Logotipo do Banco
		Else
			oPrintPvt:Say  (nLin+0644,0100,	aDadBco[8],											oFont14)	// Nome do Banco
		EndIf
		oPrintPvt:Say  (nLin+0695,0513,	aDadBco[1]+"-"+aDadBco[2],								oFont21)	// Numero do Banco + Dígito
		oPrintPvt:Say  (nLin+0704,1900,	"Recibo do Pagador",									oFont10)	// Texto Fixo

		oPrintPvt:Line (nLin+0810,0100,nLin+0810,2300)														// Quadro
		oPrintPvt:Line (nLin+0910,0100,nLin+0910,2300)														// Quadro
		oPrintPvt:Line (nLin+0980,0100,nLin+0980,2300)														// Quadro
		oPrintPvt:Line (nLin+1050,0100,nLin+1050,2300)														// Quadro

		oPrintPvt:Line (nLin+0910,0500,nLin+1050,0500)														// Quadro
		oPrintPvt:Line (nLin+0980,0750,nLin+1050,0750)														// Quadro
		oPrintPvt:Line (nLin+0910,1000,nLin+1050,1000)														// Quadro
		oPrintPvt:Line (nLin+0910,1300,nLin+0980,1300)														// Quadro
		oPrintPvt:Line (nLin+0910,1480,nLin+1050,1480)														// Quadro

		oPrintPvt:Say  (nLin+0730,0100 ,	"Local de Pagamento",									oFont8)		// Texto Fixo  

		If Alltrim(SA6->A6_COD) == "001"
			oPrintPvt:Say  (nLin+0780,0100 ,	"Pagável em qualquer banco.", oFont10)
		ElseIf Alltrim(SA6->A6_COD) == "237"
			oPrintPvt:Say  (nLin+0745,0400 ,	"Pagável preferencialmente na Rede Bradesco ou Bradesco Expresso",oFont10)
		Else																		
			oPrintPvt:Say  (nLin+0745,0400 ,	"EM QUALQUER BANCO OU CORRESP NAO BANCARIO",oFont10)
																									// 1a. Linha de Local Pagamento
		//	oPrintPvt:Say  (nLin+0785,0400 ,	"APÓS O VENCIMENTO, SOMENTE NO "+Upper(aDadBco[8]),;
		//																						oFont10)	// 2a. Linha de Local Pagamento    
		EndIf																			 			

		oPrintPvt:Say  (nLin+0730,1810,	"Data de Vencimento",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0770,2000,	StrZero(Day(aDadTit[6]),2) +"/"+;
										StrZero(Month(aDadTit[6]),2) +"/"+; 
										StrZero(Year(aDadTit[6]),4),					 		oFont11c)	// Vencimento

		oPrintPvt:Say  (nLin+0830,0100,	"Nome do Beneficiário/CNPJ/CPF:",  											oFont8)		// Texto Fixo
		//oPrintPvt:Say  (nLin+0860,0100,	AllTrim(aDadEmp[1])+ " - CNPJ: "+Transform(aDadEmp[9], "@R 99.999.999/9999-99"), oFont10)	// Nome + CNPJ
		oPrintPvt:Say  (nLin+0860,0100,	AllTrim(aDadEmp[1])+ " - CNPJ: "+Transform(aDadEmp[9], "@R 99.999.999/9999-99"), oFont10)	// Nome + CNPJ
		oPrintPvt:Say  (nLin+0890,0100,	AllTrim(aDadEmp[2])+ ' - '+Alltrim( aDadEmp[4] ) + '/' + Alltrim( aDadEmp[5] ) + ' - CEP: ' + Transform(aDadEmp[6], "@R 99.999-999" ), oFont10)	// Endereço
		//oPrintPvt:Say  (nLin+0890,0100,	AllTrim(aDadEmp[2]) + '   ' + Alltrim( aDadEmp[3] ) + ' - ' + Alltrim( aDadEmp[4] ) + '/' + Alltrim( aDadEmp[5] ) + ' - CEP: ' + Transform(aDadEmp[6], "@R 99.999-999"), oFont10)	// Nome + CNPJ

		oPrintPvt:Say  (nLin+0830,1810,	"Agência/Código Beneficiário",	     						oFont8)		// Texto Fixo
		//If aDadBco[1] == '001'
		//   _xAgeAju := SubStr( aDadBco[3], 1, Len( aDadBco[3] ) - 1 ) + '-' + SubStr( aDadBco[3], Len( aDadBco[3] ), 1 )
		//   _xConAju := Alltrim( Str( Val( aDadBco[5] ) ) )
		//   _xConAju := SubStr( _xConAju, 1, Len( _xConAju ) - 1 ) + '-' + SubStr( _xConAju, Len( _xConAju ), 1 )
		//   oPrintPvt:Say  (nLin+0870,1900,	_xAgeAju + ' / ' + _xConAju,							oFont11c)	// Agencia + Cód.Beneficiário
		//Else
		oPrintPvt:Say  (nLin+0870,1900,	AllTrim(aDadBco[15]),									oFont11c)	// Agencia + Cód.Beneficiário + Dígito
		//Endif

		oPrintPvt:Say  (nLin+0930,0100,	"Data do Documento",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0960,0150,	StrZero(Day(aDadTit[5]),2)+"/"+ ;
										StrZero(Month(aDadTit[5]),2)+"/"+ ;
										Right(Str(Year(aDadTit[5])),4),						oFont10)	// Data do Documento

		oPrintPvt:Say  (nLin+0930,0505,	"Nro.Documento",										oFont8)		// Texto Fixo
		//oPrintPvt:Say  (nLin+0960,0605,	aDadTit[1]+aDadTit[2]+aDadTit[3],						oFont10)	// Prefixo + Numero + Parcela
		oPrintPvt:Say  (nLin+0960,0605,	Alltrim(aDadTit[2]) + aDadTit[3],						oFont10)	// Prefixo + Numero + Parcela

		oPrintPvt:Say  (nLin+0930,1005,	"Espécie Doc.",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0960,1055,	aDadBco[14],											oFont10)	// Tipo do Titulo

		oPrintPvt:Say  (nLin+0930,1305,	"Aceite",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0960,1400,	"N",													oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+0930,1485,	"Data do Processamento",								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+0960,1550,	StrZero(Day(dDataBase),2)+"/"+ ;
										StrZero(Month(dDataBase),2)+"/"+ ;
										StrZero(Year(dDataBase),4),								oFont10)	// Data impressao

		oPrintPvt:Say  (nLin+0930,1810,	"Nosso Número",											oFont8)		// Texto Fixo 
		
		If Alltrim(SA6->A6_COD)$ "033"
			oPrintPvt:Say  (nLin+0960,1900,	SubStr(aBarra[4],5,9),								oFont11c)	// Nosso Número  
		Else	
		//   If Alltrim(SA6->A6_COD)$ "001"
			//_xNosNum := SubStr( aBarra[4], Len( aBarra[4] ) - 11, 11) +  '-' + SubStr( aBarra[4], Len( aBarra[4] ), 1 )
		//      _xNosNum := SubStr( aBarra[3], Len( aBarra[3] ) - 10, 10) +  '-' + SubStr( aBarra[3], Len( aBarra[3] ), 1 )
		//      oPrintPvt:Say  (nLin+0960,1900,	_xNosNum,											oFont11c)	// Nosso Número
		//   Else
			oPrintPvt:Say  (nLin+0960,1900,	aBarra[4],											oFont11c)	// Nosso Número
		//   Endif
		EndIf 

		oPrintPvt:Say  (nLin+1000,0100,	"Uso do Banco",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1030,0150,	aDadBco[13],											oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+1000,0505,	"Carteira",												oFont8)		// Texto Fixo  

		If Alltrim(SA6->A6_COD)$ "033"
			oPrintPvt:Say  (nLin+1030,0555,	aDadTit[10]+" - RCR",											oFont10)	// Carteira  
		Else	
		//	If aDadBco[1] == '001'
		//	   oPrintPvt:Say  (nLin+1030,0555,	'11'       ,											oFont10)	// Carteira
		//	Else
			oPrintPvt:Say  (nLin+1030,0555,	aDadTit[10],											oFont10)	// Carteira
		//	Endif
		EndIf	

		oPrintPvt:Say  (nLin+1000,0755,	"Espécie",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1030,0805,	"R$",													oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+1000,1005,	"Quantidade",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1000,1485,	"Valor",												oFont8)		// Texto Fixo

		oPrintPvt:Say  (nLin+1000,1810,	"Valor do Documento",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1030,1900,	Transform(aDadTit[8],"@E 9999,999,999.99"),				oFont11c)	// Valor do Título

		oPrintPvt:Say  (nLin+1070,0100,	"Instruções (Todas informações deste bloqueto são de exclusiva responsabilidade do Beneficiário)",;
																								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1120,0100,	aDadTit[11],											oFont10)	// 1a Linha Instrução
		oPrintPvt:Say  (nLin+1170,0100,	aDadTit[12],											oFont10)	// 2a. Linha Instrução
		oPrintPvt:Say  (nLin+1220,0100,	aDadTit[13],											oFont10)	// 3a. Linha Instrução
		oPrintPvt:Say  (nLin+1270,0100,	aDadTit[14],											oFont10)	// 4a. Linha Instrução
		oPrintPvt:Say  (nLin+1320,0100,	aDadTit[15],											oFont10)	// 5a. Linha Instrução
		oPrintPvt:Say  (nLin+1370,0100,	aDadTit[16],											oFont10)	// 6a. Linha Instrução

		oPrintPvt:Say  (nLin+1070,1810,	"(-)Desconto/Abatimento",								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1140,1810,	"(-)Outras Deduções",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1210,1810,	"(+)Mora/Multa",										oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1280,1810,	"(+)Outros Acréscimos",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1350,1810,	"(=)Valor Cobrado",										oFont8)		// Texto Fixo

		oPrintPvt:Say  (nLin+1420,0100,	"Pagador",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1450,0400,	aDadCli[3],												oFont10)	// Nome do Cliente
		//oPrintPvt:Say  (nLin+1430,0200,	" ("+aDaDCli[1]+"-"+aDadCli[2]+") "+aDadCli[3],		oFont10)	// Código + Nome do Cliente

		If aDadCli[6] = "J"
			oPrintPvt:Say  (nLin+1450,1850,"CNPJ: "+Transform(aDadCli[4],"@R 99.999.999/9999-99"),;
																								oFont10)	// CGC
		Else
			oPrintPvt:Say  (nLin+1450,1850,"CPF: "+Transform(aDadCli[4],"@R 999.999.999-99"),;
																								oFont10)	// CPF
		EndIf

		oPrintPvt:Say  (nLin+1503,0400,	AllTrim(aDadCli[7])+" "+AllTrim(aDadCli[8]),			oFont10)	// Endereço + Bairro
		//oPrintPvt:Say	(nLin+1483,1850,	"Entrega: "+aDadCli[12],								oFont10)	// Forma de Envio do Boleto

		oPrintPvt:Say  (nLin+1556,0400,	Transform(aDadCli[11],"@R 99999-999")+" - "+ ;
												AllTrim(aDadCli[9])+" - "+ ;
												AllTrim(aDadCli[10]),							oFont10)	// CEP + Cidade + Estado

		If Alltrim(SA6->A6_COD)$ "001"
		//   _xNosNum := SubStr( aBarra[4], Len( aBarra[4] ) - 11, 11) +  '-' + SubStr( aBarra[4], Len( aBarra[4] ), 1 )
		//   oPrintPvt:Say  (nLin+1609,1850,	_xNosNum,												oFont10)	// Nosso Número
		Else
		oPrintPvt:Say  (nLin+1609,1850,	aBarra[4],												oFont10)	// Nosso Número
		Endif
		oPrintPvt:Say  (nLin+1625,0100,	"Pagador/Avalista",	                					oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+1665,1500,	"Autenticação Mecânica",								oFont8)		// Texto Fixo

		oPrintPvt:Line (nLin+0710,1800,nLin+1400,1800)														// Quadro
		oPrintPvt:Line (nLin+1120,1800,nLin+1120,2300)														// Quadro
		oPrintPvt:Line (nLin+1190,1800,nLin+1190,2300)														// Quadro
		oPrintPvt:Line (nLin+1260,1800,nLin+1260,2300)														// Quadro
		oPrintPvt:Line (nLin+1330,1800,nLin+1330,2300)														// Quadro
		oPrintPvt:Line (nLin+1400,0100,nLin+1400,2300)														// Quadro
		oPrintPvt:Line (nLin+1640,0100,nLin+1640,2300)														// Quadro
		
	EndIf

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Pontilhado separador ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	//nLin	:= 100
	nLin	-= 100
	For nLoop := 100 To 2300 Step 50
		oPrintPvt:Line(nLin+1880, nLoop, nLin+1880, nLoop+30)												// Linha Pontilhada
	Next nI

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Define o Terceiro Bloco - Ficha de Compensação ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If Alltrim(SA6->A6_COD)$ "001"
		oPrintPvt:Line (nLin+2000,0100,nLin+2000,2300)										// Quadro
		oPrintPvt:Line (nLin+2000,0500,nLin+1920,0500)										// Quadro
		oPrintPvt:Line (nLin+2000,0710,nLin+1920,0710)										// Quadro

		If !Empty(aDadBco[9])
			oPrintPvt:SayBitMap(nLin+1934,0100,cBmp,350,060)													// Logotipo do Banco
		Else
			oPrintPvt:Say  (nLin+1934,100,	aDadBco[8],												oFont14)	// Nome do Banco
		EndIf
		oPrintPvt:Say  (nLin+1985,0513,	aDadBco[1]+"-"+aDadBco[2],								oFont21)	// Numero do Banco + Dígito
		oPrintPvt:Say  (nLin+1974,0755,	aBarra[2],												oFont15n)	// Linha Digitavel do Codigo de Barras

		oPrintPvt:Line (nLin+2100,100,nLin+2100,2300 )									// Quadro
		oPrintPvt:Line (nLin+2200,100,nLin+2200,2300 )									// Quadro
		oPrintPvt:Line (nLin+2270,100,nLin+2270,2300 )									// Quadro
		oPrintPvt:Line (nLin+2340,100,nLin+2340,2300 )									// Quadro

		oPrintPvt:Line (nLin+2200,0500,nLin+2340,0500)									// Quadro
		oPrintPvt:Line (nLin+2270,0750,nLin+2340,0750)									// Quadro
		oPrintPvt:Line (nLin+2200,1000,nLin+2340,1000)									// Quadro
		oPrintPvt:Line (nLin+2200,1300,nLin+2270,1300)									// Quadro
		oPrintPvt:Line (nLin+2200,1480,nLin+2340,1480)									// Quadro

		oPrintPvt:Say  (nLin+2020,0100,	"Local de Pagamento",									oFont8)		// Texto Fixo  

		oPrintPvt:Say  (nLin+2050,0100,	"Pagável em qualquer banco.",  	oFont10)	// Texto Fixo 

		oPrintPvt:Say  (nLin+2020,1810,	"Data de Vencimento",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2060,1900,	StrZero(Day(aDadTit[6]),2)+"/"+;
										StrZero(Month(aDadTit[6]),2)+"/"+;
										StrZero(Year(aDadTit[6]),4),							oFont11c)	// Vencimento

		oPrintPvt:Say  (nLin+2120,0100,	"Nome do Beneficiário/CNPJ/CPF:",   											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2160,0100,	AllTrim(aDadEmp[1])+ " - CNPJ: "+Transform(aDadEmp[9], "@R 99.999.999/9999-99"),;
																								oFont10)	// Nome + CNPJ

		oPrintPvt:Say  (nLin+2120,1810,	"Agência/Código Beneficiário",  						oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2160,1900,	AllTrim(aDadBco[15]),									oFont11c)	// Agencia + Cód.Beneficiário + Dígito

		oPrintPvt:Say  (nLin+2220,0100,	"Data do Documento",									oFont8)		// Texto Fixo
		oPrintPvt:Say	(nLin+2250,0100, 	StrZero(Day(aDadTit[5]),2)+"/"+ ;
										StrZero(Month(aDadTit[5]),2)+"/"+ ;
										StrZero(Year(aDadTit[5]),4),		 					oFont10)	// Vencimento

		oPrintPvt:Say  (nLin+2220,0505,	"Nro.Documento",										oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2250,0605,	Alltrim(aDadTit[2]) + aDadTit[3],						oFont10)	// Prefixo + Numero + Parcela

		oPrintPvt:Say  (nLin+2220,1005,	"Espécie Doc.",						   					oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2250,1050,	aDadBco[14],											oFont10)	//Tipo do Titulo

		oPrintPvt:Say  (nLin+2220,1305,	"Aceite",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2250,1400,	"N",													oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+2220,1485,	"Data do Processamento",								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2250,1550,	StrZero(Day(dDataBase),2)+"/"+ ;
										StrZero(Month(dDataBase),2)+"/"+ ;
										StrZero(Year(dDataBase),4),								oFont10)	// Data impressao

		oPrintPvt:Say  (nLin+2220,1810,	"Nosso Número",											oFont8)		// Texto Fixo   
		oPrintPvt:Say  (nLin+2250,1900,	aBarra[4],												oFont11c)	// Nosso Número

		oPrintPvt:Say  (nLin+2290,0100,	"Uso do Banco",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2320,0150,	aDadBco[13],											oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+2290,0505,	"Carteira",												oFont8)		// Texto Fixo 
		oPrintPvt:Say  (nLin+2320,0555,	aDadTit[10],											oFont10)

		oPrintPvt:Say  (nLin+2290,0755,	"Espécie",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2320,0805,	"R$",													oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+2290,1005,	"Quantidade",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2290,1485,	"xValor",												oFont8)		// Texto Fixo

		oPrintPvt:Say  (nLin+2290,1810,	"Valor do Documento",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2320,1900,	Transform(aDadTit[8], "@E 9999,999,999.99"),			oFont11c)	// Valor do Documento

		oPrintPvt:Say  (nLin+2360,0100,	"Informações de responsabilidade do beneficiário",;
																								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2420,0100,	aDadTit[11],											oFont10)	// 1a Linha Instrução
		oPrintPvt:Say  (nLin+2470,0100,	aDadTit[12],											oFont10)	// 2a. Linha Instrução
		oPrintPvt:Say  (nLin+2520,0100,	aDadTit[13],											oFont10)	// 3a. Linha Instrução
	//	oPrintPvt:Say  (nLin+2570,0100,	aDadTit[14],											oFont10)	// 4a. Linha Instrução
	//	oPrintPvt:Say  (nLin+2620,0100,	aDadTit[15],											oFont10)	// 5a. Linha Instrução
	//	oPrintPvt:Say  (nLin+2670,0100,	aDadTit[16],											oFont10)	// 6a. Linha Instrução

		oPrintPvt:Say  (nLin+2360,1810,	"(-)Desconto/Abatimento",								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2430,1810,	"(+)Juros/Multa",										oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2500,1810,	"(=)Valor Cobrado",										oFont8)		// Texto Fixo

		oPrintPvt:Say  (nLin+2567,0100,	"Nome do Pagador/CPF/CNPJ/Endereço",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2600,0100,	aDadCli[3]+ " - CNPJ: "+Transform(aDadCli[4],"@R 99.999.999/9999-99"),												oFont10)	// Nome Cliente 
		oPrintPvt:Say  (nLin+2640,0100,	Alltrim(aDadCli[7])+" "+AllTrim(aDadCli[8]),			oFont10)	// Endereço
		oPrintPvt:Say  (nLin+2680,0100,	"CEP - "+Transform(aDadCli[11],"@R 99999-999")+" - "+;
										AllTrim(aDadCli[9])+" - "+AllTrim(aDadCli[10]),		oFont10)	// CEP + Cidade + Estado

		oPrintPvt:Say  (nLin+2875,0100,	"Sacador/Avalista",                                     oFont8)		// Texto Fixo + Pagador Avalista
		oPrintPvt:Say  (nLin+2875,1500,	"Autenticação Mecânica - Ficha de Compensação",			oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2850,1500,	"Código de baixa",										oFont8)		// Texto Fixo

		oPrintPvt:Line (nLin+2020,1800,nLin+2550,1800)				// Quadro
		oPrintPvt:Line (nLin+2410,1800,nLin+2410,2300)				// Quadro
		oPrintPvt:Line (nLin+2480,1800,nLin+2480,2300)				// Quadro
		oPrintPvt:Line (nLin+2550,0100,nLin+2550,2300)				// Quadro
		oPrintPvt:Line (nLin+2860,0100,nLin+2860,2300)				// Quadro

	Else
		oPrintPvt:Line (nLin+2000,0100,nLin+2000,2300)										// Quadro
		oPrintPvt:Line (nLin+2000,0500,nLin+1920,0500)										// Quadro
		oPrintPvt:Line (nLin+2000,0710,nLin+1920,0710)										// Quadro

		If !Empty(aDadBco[9])
			oPrintPvt:SayBitMap(nLin+1934,0100,cBmp,350,060)													// Logotipo do Banco
		Else
			oPrintPvt:Say  (nLin+1934,100,	aDadBco[8],												oFont14)	// Nome do Banco
		EndIf
		oPrintPvt:Say  (nLin+1985,0513,	aDadBco[1]+"-"+aDadBco[2],								oFont21)	// Numero do Banco + Dígito
		oPrintPvt:Say  (nLin+1974,0755,	aBarra[2],												oFont15n)	// Linha Digitavel do Codigo de Barras

		oPrintPvt:Line (nLin+2100,100,nLin+2100,2300 )									// Quadro
		oPrintPvt:Line (nLin+2200,100,nLin+2200,2300 )									// Quadro
		oPrintPvt:Line (nLin+2270,100,nLin+2270,2300 )									// Quadro
		oPrintPvt:Line (nLin+2340,100,nLin+2340,2300 )									// Quadro

		oPrintPvt:Line (nLin+2200,0500,nLin+2340,0500)									// Quadro
		oPrintPvt:Line (nLin+2270,0750,nLin+2340,0750)									// Quadro
		oPrintPvt:Line (nLin+2200,1000,nLin+2340,1000)									// Quadro
		oPrintPvt:Line (nLin+2200,1300,nLin+2270,1300)									// Quadro
		oPrintPvt:Line (nLin+2200,1480,nLin+2340,1480)									// Quadro

		oPrintPvt:Say  (nLin+2020,0100,	"Local de Pagamento",									oFont8)		// Texto Fixo  

		If Alltrim(SA6->A6_COD) == "001"
			oPrintPvt:Say  (nLin+2050,0100,	"Pagável em qualquer banco.",  	oFont10)	// Texto Fixo 
		ElseIf Alltrim(SA6->A6_COD) == "237"
			oPrintPvt:Say  (nLin+2035,0400,	"Pagável preferencialmente na Rede Bradesco ou Bradesco Expresso", oFont10)	// Texto Fixo
		Else 	
			oPrintPvt:Say  (nLin+2035,0400,	"EM QUALQUER BANCO OU CORRESP NAO BANCARIO", oFont10)	// Texto Fixo
		//	oPrintPvt:Say  (nLin+2075,0400 ,	"APÓS O VENCIMENTO, SOMENTE NO "+aDadBco[8], oFont10)	// Texto Fixo 

		EndIf
				
		oPrintPvt:Say  (nLin+2020,1810,	"Data de Vencimento",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2060,1900,	StrZero(Day(aDadTit[6]),2)+"/"+;
										StrZero(Month(aDadTit[6]),2)+"/"+;
										StrZero(Year(aDadTit[6]),4),							oFont11c)	// Vencimento

		oPrintPvt:Say  (nLin+2120,0100,	"Nome do Beneficiário/CNPJ/CPF:",   											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2160,0100,	AllTrim(aDadEmp[1])+ " - CNPJ: "+Transform(aDadEmp[9], "@R 99.999.999/9999-99"),	oFont10)	// Nome + CNPJ
		oPrintPvt:Say  (nLin+2190,0100,	AllTrim(aDadEmp[2])+ ' - '+Alltrim( aDadEmp[4] ) + '/' + Alltrim( aDadEmp[5] ) + ' - CEP: ' + Transform(aDadEmp[6], "@R 99.999-999" ), oFont10)	// Endereço

		oPrintPvt:Say  (nLin+2120,1810,	"Agência/Código Beneficiário",   							oFont8)		// Texto Fixo
		//If aDadBco[1] == '001'
		//   _xAgeAju := SubStr( aDadBco[3], 1, Len( aDadBco[3] ) - 1 ) + '-' + SubStr( aDadBco[3], Len( aDadBco[3] ), 1 )
		//   _xConAju := Alltrim( Str( Val( aDadBco[5] ) ) )
		//   _xConAju := SubStr( _xConAju, 1, Len( _xConAju ) - 1 ) + '-' + SubStr( _xConAju, Len( _xConAju ), 1 )
		//   oPrintPvt:Say  (nLin+2160,1900,	_xAgeAju + ' / ' + _xConAju,							oFont11c)	// Agencia + Cód.Beneficiário
		//Else
		oPrintPvt:Say  (nLin+2160,1900,	AllTrim(aDadBco[15]),									oFont11c)	// Agencia + Cód.Beneficiário + Dígito
		//Endif

		oPrintPvt:Say  (nLin+2220,0100,	"Data do Documento",									oFont8)		// Texto Fixo
		oPrintPvt:Say	(nLin+2250,0100, 	StrZero(Day(aDadTit[5]),2)+"/"+ ;
										StrZero(Month(aDadTit[5]),2)+"/"+ ;
										StrZero(Year(aDadTit[5]),4),		 					oFont10)	// Vencimento

		oPrintPvt:Say  (nLin+2220,0505,	"Nro.Documento",										oFont8)		// Texto Fixo
		//oPrintPvt:Say  (nLin+2250,0605,	aDadTit[1]+aDadTit[2]+aDadTit[3],						oFont10)	// Prefixo + Numero + Parcela
		oPrintPvt:Say  (nLin+2250,0605,	Alltrim(aDadTit[2]) + aDadTit[3],						oFont10)	// Prefixo + Numero + Parcela

		oPrintPvt:Say  (nLin+2220,1005,	"Espécie Doc.",						   					oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2250,1050,	aDadBco[14],											oFont10)	//Tipo do Titulo

		oPrintPvt:Say  (nLin+2220,1305,	"Aceite",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2250,1400,	"N",													oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+2220,1485,	"Data do Processamento",								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2250,1550,	StrZero(Day(dDataBase),2)+"/"+ ;
										StrZero(Month(dDataBase),2)+"/"+ ;
										StrZero(Year(dDataBase),4),								oFont10)	// Data impressao

		oPrintPvt:Say  (nLin+2220,1810,	"Nosso Número",											oFont8)		// Texto Fixo   

		If Alltrim(SA6->A6_COD)$ "033"
			oPrintPvt:Say  (nLin+2250,1900,	SubStr(aBarra[4],5,9),								oFont11c)	// Nosso Número  
		Else	
		//   If Alltrim(SA6->A6_COD)$ "001"
			//_xNosNum := SubStr( aBarra[4], Len( aBarra[4] ) - 11, 11) +  '-' + SubStr( aBarra[4], Len( aBarra[4] ), 1 )
		//      _xNosNum := SubStr( aBarra[3], Len( aBarra[3] ) - 10, 10) +  '-' + SubStr( aBarra[3], Len( aBarra[3] ), 1 )
		//     oPrintPvt:Say  (nLin+2250,1900,	_xNosNum ,											oFont11c)	// Nosso Número
		//   Else
			oPrintPvt:Say  (nLin+2250,1900,	aBarra[4],											oFont11c)	// Nosso Número
		//	Endif
		EndIf

		oPrintPvt:Say  (nLin+2290,0100,	"Uso do Banco",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2320,0150,	aDadBco[13],											oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+2290,0505,	"Carteira",												oFont8)		// Texto Fixo 

		If Alltrim(SA6->A6_COD)$ "033"
			oPrintPvt:Say  (nLin+2320,0555,	aDadTit[10]+" - RCR",								oFont10)
		Else	
		//	If aDadBco[1] == '001'
		//	   oPrintPvt:Say  (nLin+2320,0555,	'11'       ,										oFont10)
		//	Else
			oPrintPvt:Say  (nLin+2320,0555,	aDadTit[10],										oFont10)
		//	Endif 
		EndIf	

		oPrintPvt:Say  (nLin+2290,0755,	"Espécie",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2320,0805,	"R$",													oFont10)	// Texto Fixo

		oPrintPvt:Say  (nLin+2290,1005,	"Quantidade",											oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2290,1485,	"xValor",												oFont8)		// Texto Fixo

		oPrintPvt:Say  (nLin+2290,1810,	"Valor do Documento",									oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2320,1900,	Transform(aDadTit[8], "@E 9999,999,999.99"),			oFont11c)	// Valor do Documento

		oPrintPvt:Say  (nLin+2360,0100,	"Informações de responsabilidade do beneficiário",;
																								oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2420,0100,	aDadTit[11],											oFont10)	// 1a Linha Instrução
		oPrintPvt:Say  (nLin+2470,0100,	aDadTit[12],											oFont10)	// 2a. Linha Instrução
		oPrintPvt:Say  (nLin+2520,0100,	aDadTit[13],											oFont10)	// 3a. Linha Instrução
		oPrintPvt:Say  (nLin+2570,0100,	aDadTit[14],											oFont10)	// 4a. Linha Instrução
		oPrintPvt:Say  (nLin+2620,0100,	aDadTit[15],											oFont10)	// 5a. Linha Instrução
		oPrintPvt:Say  (nLin+2670,0100,	aDadTit[16],											oFont10)	// 6a. Linha Instrução

		If Alltrim(SA6->A6_COD)$ "001"
			oPrintPvt:Say  (nLin+2360,1810,	"(-)Desconto/Abatimento",								oFont8)		// Texto Fixo
		//	oPrintPvt:Say  (nLin+2430,1810,	"(-)Outras Deduções",									oFont8)		// Texto Fixo
			oPrintPvt:Say  (nLin+2500,1810,	"(+)Juros/Multa",										oFont8)		// Texto Fixo
		//	oPrintPvt:Say  (nLin+2570,1810,	"(+)Outros Acréscimos",									oFont8)		// Texto Fixo
			oPrintPvt:Say  (nLin+2640,1810,	"(=)Valor Cobrado",										oFont8)		// Texto Fixo
		Else
			oPrintPvt:Say  (nLin+2360,1810,	"(-)Desconto/Abatimento",								oFont8)		// Texto Fixo
			oPrintPvt:Say  (nLin+2430,1810,	"(-)Outras Deduções",									oFont8)		// Texto Fixo
			oPrintPvt:Say  (nLin+2500,1810,	"(+)Mora/Multa",										oFont8)		// Texto Fixo
			oPrintPvt:Say  (nLin+2570,1810,	"(+)Outros Acréscimos",									oFont8)		// Texto Fixo
			oPrintPvt:Say  (nLin+2640,1810,	"(=)Valor Cobrado",										oFont8)		// Texto Fixo
		EndIf
		oPrintPvt:Say  (nLin+2710,0100,	"Nome do Pagador/CPF/CNPJ/Endereço",												oFont8)		// Texto Fixo
		oPrintPvt:Say  (nLin+2720,0400,	aDadCli[3],												oFont10)	// Nome Cliente 
		//oPrintPvt:Say  (nLin+2700,0200,	" ("+aDadCli[1]+"-"+aDadCli[2]+") "+aDadCli[3],		oFont10)	// Nome Cliente + Código

		If aDadCli[6] = "J"
			oPrintPvt:Say  (nLin+2720,1850,	"CNPJ: "+Transform(aDadCli[4],"@R 99.999.999/9999-99"),;
																								oFont10)	// CGC
		Else
			oPrintPvt:Say  (nLin+2720,1850,	"CPF: "+Transform(aDadCli[4],"@R 999.999.999-99"),;
																								oFont10)	// CPF
		EndIf

		oPrintPvt:Say  (nLin+2773,0400,	Alltrim(aDadCli[7])+" "+AllTrim(aDadCli[8]),			oFont10)	// Endereço
		//oPrintPvt:Say	(nLin+2753,1850,	"Entrega: "+aDadCli[12],								oFont10)	// Forma de Envio do Boleto

		oPrintPvt:Say  (nLin+2826,0400,	Transform(aDadCli[11],"@R 99999-999")+" - "+;
										AllTrim(aDadCli[9])+" - "+AllTrim(aDadCli[10]),		oFont10)	// CEP + Cidade + Estado

		//oPrintPvt:Say  (nLin+2806,1850,	aBarra[4],												oFont10)	// Carteira + Nosso Número

		oPrintPvt:Say  (nLin+2875,0100,	"Pagador/Avalista",                                     oFont8)		// Texto Fixo + Pagador Avalista
		oPrintPvt:Say  (nLin+2915,1500,	"Autenticação Mecânica - Ficha de Compensação",			oFont8)		// Texto Fixo

		oPrintPvt:Line (nLin+2020,1800,nLin+2690,1800)														// Quadro
		oPrintPvt:Line (nLin+2410,1800,nLin+2410,2300)														// Quadro
		oPrintPvt:Line (nLin+2480,1800,nLin+2480,2300)														// Quadro
		oPrintPvt:Line (nLin+2550,1800,nLin+2550,2300)														// Quadro
		oPrintPvt:Line (nLin+2620,1800,nLin+2620,2300)														// Quadro
		oPrintPvt:Line (nLin+2690,0100,nLin+2690,2300)														// Quadro
		oPrintPvt:Line (nLin+2890,0100,nLin+2890,2300)														// Quadro

	EndIf
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Se Impressão em polegadas ³
	//³ Guarabira                 ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If nTpImp == 1 

		MSBAR3(	"INT25",;
				13.0,;
				0.8,;
				aBarra[1],;
				oPrintPvt,;
				.F.,;
				Nil,;
				Nil,;
				0.013,;
				0.7,;
				Nil,;
				Nil,;
				"A",;
				.F.)
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Se Impressão em centímetros ³
	//³ Campinas                    ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	Else  
		
		oPrintPvt:FwMsBar("INT25", 66.5,2.1, aBarra[1], oPrintPvt, .F., NIL, .T., 0.025, 1.5, .F., NIL, NIL, .F.)
		/*
		MSBAR3("INT25",;			// Tipo do código (EAN13,EAN8,UPCA,SUP5,CODE128,INT25,MAT25,IND25,CODABAR,CODE3_9,EAN128)
				24.0,;				// Número da linha em centímetros 24.0
				0.8,;				// Número da coluna em centímetros
				aBarra[1],;			// String com o conteúdo do código
				oPrintPvt,;			// Objeto printer
				.F.,;				// Se calcula o dígito de controle
				Nil,;				// Número da Cor (utilizar a Common.ch)
				Nil,;				// Se imprime na horizontal
				0.025,;				// Número do tamanho da barra em centímetros
				1.5,;				// Número da altura da barra em milímetros
				Nil,;				// Imprime linha embaixo do código
				Nil,;				// String com o tipo de fonte
				"A",;				// String com o modo do código de barras
				.F.)				// ??
		*/
	EndIf

	oPrintPvt:EndPage() // Finaliza a página

Return(Nil)


User Function fBusCHV()

	Local aArea   := FWGetArea()
	Local cChvNfe := ""

	cChvNfe := Alltrim(Posicione("SF2",2,FWxFilial("SF2")+SE1->(E1_CLIENTE+E1_LOJA+E1_NUM+E1_PREFIXO),"F2_CHVNFE"))
	
	FWRestArea(aArea)
	
Return (cChvNfe)
