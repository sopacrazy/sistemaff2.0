//Bibliotecas
#Include "Protheus.ch"
#Include "TopConn.ch"
#Include "rwmake.ch"
#Include "FINR470.CH"
#include "TOTVS.CH"

#DEFINE REC_NAO_CONCILIADO 1
#DEFINE REC_CONCILIADO	   2
#DEFINE PAG_NAO_CONCILIADO 3
#DEFINE PAG_CONCILIADO	   4

/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÚÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄ¿±±
±±³Fun‡„o	 ³ FINR470	³ Autor ³ Wagner Xavier 	    ³ Data ³ 20.10.92 ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄ´±±
±±³Descri‡„o ³ Extrato Banc rio. 										  ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³Sintaxe e ³ FINR470(void)											  ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³ Uso		 ³ Generico 												  ³±±
±±ÀÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
///////////////////////
User Function RfinR02()
///////////////////////
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Define Variaveis 														  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	
	LOCAL cDesc1  := "Este programa ira emitir o relat¢rio de movimentações"   //"Este programa ira  emitir o relat¢rio de movimentações"
	LOCAL cDesc2  := "bancarias em ordem de data. Poder  ser utilizado para"   //"bancarias em ordem de data. Poder  ser utilizado para"
	LOCAL cDesc3  := "Fechamento Caixa Diario."  							  //"Extrato Bancario"
	LOCAL cString := "SE5"
	LOCAL Tamanho := "M"

	PRIVATE wnrel    := "RFINR02"
	PRIVATE cabec1   := ''
	PRIVATE cabec2   := ''
	PRIVATE titulo   := OemToAnsi('Fechamento Caixa Diario')  				//"Extrato Bancario"
	PRIVATE aReturn  := { "Zebrado", 1, "Administracao", 2, 2, 1, "", 1} 	//"Zebrado"###"Administracao"
	PRIVATE nomeprog := " RfinR02"	
	PRIVATE nLastKey := 0
	PRIVATE _lFech   := .F.
	Private _ndi     := 0
	PRIVATE _nCh     := 0   
	PRIVATE _nCc     := 0   
	PRIVATE _nCd     := 0   
	PRIVATE _ntk     := 0   
	PRIVATE _nou     := 0   
	//PRIVATE limite   := 132
	//PRIVATE aLinha   := { }
	//PRIVATE cPerg	 := "FIN470"

	// BLOCO PARA GRAVAR OS VALORES DE FINHEIRO E CHEQUE
	_nValDinhe := _nValCheque := _nValCc := _nValCd := _nValtk := _nValou := 0

	cPerg := "FINR02"
	ValidPerg()

	If ApMsgNoYes( " Deseja Informar Valores de Fechamento ?", "ATENÇÃO -> " + UPPER(ALLTRIM(CUSERNAME)) )
		pergunte("FINR02",.T.)	//--> Informa valore do Fechamento
		_nValDinhe  := MV_PAR01
		_nValCheque := MV_PAR02
		_nValCc     := MV_PAR03
		_nValCd     := MV_PAR04
		_nValtk     := MV_PAR05
		_nValou     := MV_PAR06

		If _nValCc + _nValCd + _nValtk  > 0
			ValorAdm(dDataBase,_nValCC, _nValcD, _nValtk)
		Endif	
	Else
		_nValDinhe  := _ndi
		_nValCheque := _nch
		_nValCc     := _ncc
		_nValCd     := _ncd
		_nValtk     := _ntk
		_nValou     := _nou
	Endif   

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Verifica as perguntas selecionadas 								  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	cPerg := "FIN470" 
	pergunte("FIN470",.F.)
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Variaveis utilizadas para parametros								 ³
	//³ mv_par01				// Banco 										 ³
	//³ mv_par02				// Agencia										 ³
	//³ mv_par03				// Conta 										 ³
	//³ mv_par04				// a partir de 								 ³
	//³ mv_par05				// ate											 ³
	//³ mv_par06				// Qual Moeda									 ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Envia controle para a fun‡„o SETPRINT 							  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	//wnrel := "FINR470"            //Nome Default do relatorio em Disco
	wnrel := SetPrint(cString,wnrel,cPerg,@titulo,cDesc1,cDesc2,cDesc3,.F.,"",.T.,Tamanho,,.T.)
    
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Envia controle para a funcao REPORTINI substituir as variaveis.³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If nLastKey == 27
		Return
	Endif

	SetDefault(aReturn,cString)

	If nLastKey == 27
		Return
	Endif

	RptStatus({|lEnd| Fa470Imp(@lEnd,wnRel,cString)},titulo)

Return
/////////////////////////////////////////////////////////////////////////////////////

/*
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÚÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄ¿±±
±±³Fun‡„o	 ³ FA470IMP ³ Autor ³ Wagner Xavier 		  ³ Data ³ 20.10.92 ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄ´±±
±±³Descri‡„o ³ Extrato Banc rio. 													  ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
*/
////////////////////////////////////////////
Static Function FA470Imp(lEnd,wnRel,cString)
////////////////////////////////////////////
	LOCAL CbCont,CbTxt
	LOCAL tamanho:="M"
	LOCAL cBanco,cNomeBanco,cAgencia,cConta,nRec,cLimCred
	LOCAL nSaldoAtu:=0,nTipo,nVALOR:=0,nSaidas:=0,nSaldoIni:=0
	LOCAL cDOC
	LOCAL cFil	  :=""
	LOCAL nOrdSE5 :=SE5->(IndexOrd())
	LOCAL cChave
	LOCAL cIndex
	LOCAL aRecon := {}
	Local nTxMoeda := 1
	Local nValor := 0
	Local aStru 	:= SE5->(dbStruct()), ni
	Local nMoeda	:= GetMv("MV_CENT"+(IIF(mv_par06 > 1 , STR(mv_par06,1),"")))
	Local nMoedaBco:=	1
	LOCAL nSalIniStr := 0
	LOCAL nSalIniCip := 0
	LOCAL nSalIniComp := 0
	LOCAL nSalStr := 0
	LOCAL nSalCip := 0
	LOCAL nSalComp := 0
	LOCAL lSpbInUse := SpbInUse()
	LOCAL aStruct := {}
	Local cFilterUser
	Local _lEfetiva := .F.

	AAdd( aRecon, {0,0,0,0} )

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Variaveis privadas exclusivas deste programa                 ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	PRIVATE cCondWhile, lAllFil :=.F.

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Variaveis utilizadas para Impressao do Cabecalho e Rodape	  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	cbtxt 	:= SPACE(10)
	cbcont	:= 0
	li 		:= 80
	m_pag 	:= 1

	dbSelectArea("SA6")
	dbSetOrder(1)
	IF !(dbSeek(cFilial+mv_par01+mv_par02+mv_par03))
		Help(" ",1,"BCONAOEXIST")
		Return
	EndIF

	cBanco		:= A6_COD
	cNomeBanco	:= A6_NREDUZ
	cAgencia	:= A6_AGENCIA
	cConta		:= A6_NUMCON
	nLimCred	:= A6_LIMCRED
	If cPaisLoc	#	"BRA"
		nMoedaBco	:=	Max(A6_MOEDA,1)
	Endif
	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Defini‡„o dos cabe‡alhos												  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If _lFech
		titulo := "Fechamento Caixa Diario - ENCERRADO -  "+DTOC(mv_par04) + " e " +Dtoc(mv_par05)  //"EXTRATO BANCARIO ENTRE "
	Else
		titulo := "Fechamento Caixa Diario "+DTOC(mv_par04) + " e " +Dtoc(mv_par05)  //"EXTRATO BANCARIO ENTRE "
	Endif
	cabec1 := "--- Recebimento Fiado --- " + OemToAnsi('BANCO: ') + cBanco + " - " + ALLTRIM(cNomeBanco) + OemToAnsi(' AGENCIA: ')+ cAgencia + OemToAnsi(' CONTA: ')+ cConta  //"BANCO "###"   AGENCIA "###"   CONTA "
	cabec2 := OemToAnsi("DATA        BENEFICIARIO                                    PREFIXO/TITULO              VALOR   MOT BAIXA   ")
	nTipo  :=IIF(aReturn[4]==1,15,18)

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Saldo de Partida 														  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	dbSelectArea("SE8")
	dbSetOrder(1)
	dbSeek( cFilial+cBanco+cAgencia+cConta+Dtos(mv_par04),.T.)
	dbSkip(-1)

	IF E8_BANCO!=cBanco .or. E8_AGENCIA!=cAgencia .or. E8_CONTA!=cConta .or. BOF() .or. EOF()
		nSaldoAtu:=0
		nSaldoIni:=0
	Else
		nSaldoAtu:=Round(xMoeda(E8_SALATUA,nMoedaBco,mv_par06,SE8->E8_DTSALAT,nMoeda+1),nMoeda)
		nSaldoIni:=Round(xMoeda(E8_SALATUA,nMoedaBco,mv_par06,SE8->E8_DTSALAT,nMoeda+1),nMoeda)
	Endif

	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Filtra o arquivo por tipo e vencimento							  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	If Empty(xFilial( "SA6")) .and. !Empty(xFilial("SE5"))
		//cChave	:= "E5_RECPAG+DTOS(E5_DTDISPO)+E5_BANCO+E5_AGENCIA+E5_CONTA"
		  cChave	:= "E5_RECPAG+DTOS(E5_DTDISPO)+E5_PREFIXO+E5_BANCO+E5_AGENCIA+E5_CONTA"
		lAllFil:= .T.
	Else
		//cChave  := "E5_FILIAL+E5_RECPAG+DTOS(E5_DTDISPO)+E5_BANCO+E5_AGENCIA+E5_CONTA"
		  cChave  := "E5_FILIAL+E5_RECPAG+DTOS(E5_DTDISPO)+E5_PREFIXO+E5_BANCO+E5_AGENCIA+E5_CONTA"
	EndIf

	dbSelectArea("SE5")
	dbSetOrder(1)
	cIndex	:= CriaTrab(nil,.f.)

	dbSelectArea("SE5")
	IndRegua("SE5",cIndex,cChave,,Nil,OemToAnsi("Selecionando Registros..."))  //"Selecionando Registros..."
	
	#IFNDEF TOP
	nIndex	:= RetIndex("SE5")
	dbSetIndex(cIndex+OrdBagExt())
	dbSetOrder(nIndex+1)
	#ENDIF   
	
	cFil:= Iif(lAllFil,"",xFilial("SE5"))
	dbGoTop()

	dbSeek(cFil+"R"+DtoS(mv_par04),.T.)
	SetRegua(RecCount())

	If  lAllFil
		cCondWhile := "!Eof() .And. E5_DTDISPO <= mv_par05"
	Else
		cCondWhile := "!Eof() .And. E5_FILIAL == xFilial('SE5') .And. E5_DTDISPO <= mv_par05"
	EndIf

	// Filtro do Usuario
	cFilterUser := aReturn[7]


	// Bloco PARA IMPRIMIR OS RECEBIMENTO DE FIADO.
	If _lFech
		titulo := "Fechamento Caixa Diario - ENCERRADO -  "+DTOC(mv_par04) + " e " +Dtoc(mv_par05)  //"EXTRATO BANCARIO ENTRE "
	Else
		titulo := "Fechamento Caixa Diario "+DTOC(mv_par04) + " e " +Dtoc(mv_par05)  //"EXTRATO BANCARIO ENTRE "
	Endif

	cabec1 := "--- Recebimento Fiado --- " + OemToAnsi('BANCO: ') + cBanco + " - " + ALLTRIM(cNomeBanco) + OemToAnsi(' AGENCIA: ')+ cAgencia + OemToAnsi(' CONTA: ')+ cConta  //"BANCO "###"   AGENCIA "###"   CONTA "
	cabec2 := OemToAnsi("DATA        BENEFICIARIO                                    PREFIXO/TITULO              VALOR   MOT BAIXA   ")
	
	dbSeek(cFil+"R"+DtoS(mv_par04),.T.)
	
	LI        := 80
	_nTotVis  := 0
	_nTotBol  := 0
	_nTotRecF := 0
	
	While &(cCondWhile) .And. SE5->E5_RECPAG == "R"

		IncRegua()
		IF li >= 55
			cabec(@titulo,cabec1,cabec2,nomeprog,tamanho,nTipo)
			@li,000 PSAY "--- Recebimento Fiado: "
			li+=2
		EndIF

		If SE5->E5_MOTBX != "BOL"
			If !Fr470Skip(cBanco,cAgencia,cConta)
				dbSkip()
				Loop
			EndIf
		Else
			IF E5_TIPODOC $ "DC/JR/MT/CM/D2/J2/M2/C2/V2/CP/TL"
				dbSkip()
				Loop
			Endif
		Endif

		If AllTrim(SE5->E5_SITUACA) == "C" .Or. AllTrim(SE5->E5_SITUACA) == "X" .Or. AllTrim(SE5->E5_SITUACA) == "E" .Or. Trim(SE5->E5_TIPODOC) == "ES" .Or. (AllTrim(SE5->E5_TIPODOC) == "RA" .And. !Empty(SE5->E5_KEY))
		   /* Ignorar Títulos de RA que possuem Estorno/Cancelamento - Sergio Coelho (Inovatuva) 23/01/2020 10:00 */
		   
			dbSkip()
			Loop
		Endif

		IF E5_MOEDA $ "C1/C2/C3/C4/C5/CH" .and. Empty(E5_NUMCHEQ) .and. !(E5_TIPODOC $ "TR#TE")
			dbSkip()
			Loop
		Endif

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Na transferencia somente considera nestes numerarios 		  ³
		//³ No Fina100 ‚ tratado desta forma.                    		  ³
		//³ As transferencias TR de titulos p/ Desconto/Cau‡Æo (FINA060) ³
		//³ nÆo sofrem mesmo tratamento dos TR bancarias do FINA100      ³
		//³ Aclaracao : Foi incluido o tipo $ para os movimentos en di-- ³
		//³ nheiro em QUALQUER moeda, pois o R$ nao e representativo     ³
		//³ fora do BRASIL. Bruno 07/12/2000 Paraguai                    ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If E5_TIPODOC $ "TR/TE" .and. Empty(E5_NUMERO)
			If !(E5_MOEDA $ "R$/DO/TB/TC/CH"+IIf(cPaisLoc=="BRA","","/$ "))
				dbSkip()
				Loop
			Endif
		Endif

		If E5_TIPODOC $ "TR/TE" .and. (Substr(E5_NUMCHEQ,1,1)=="*" ;
		.or. Substr(E5_DOCUMEN,1,1) == "*" )
			dbSkip()
			Loop
		Endif

		If E5_MOEDA == "CH" .and. IsCaixaLoja(E5_BANCO)		// Sangria
			dbSkip()
			Loop
		Endif

		If !Empty( E5_MOTBX ) .And. Trim(E5_MOTBX) != "BOL"
			If !MovBcoBx( E5_MOTBX )
				dbSkip( )
				Loop
			EndIf
		EndIf

		If Empty( E5_MOTBX )
			dbSkip( )
			Loop
		EndIf
		If E5_MOTBX == "FAT" .OR. E5_MOTBX == "DAC" .OR. E5_MOTBX == "LIQ"
			dbSkip( )
			Loop
		EndIf


		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Considera filtro do usuario                                  ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If !Empty(cFilterUser).and.!(&cFilterUser)
			dbSkip()
			Loop
		Endif

		If SE5->E5_PREFIXO == "BIL"
			SZ4->(dbSetOrder(1))
			SZ4->(dbGoTop())
			If SZ4->(dbSeek( xFilial("SZ4") + SE5->E5_NUMERO ))
				If SZ4->Z4_COND == "001"
					_nTotVis := _nTotVis + SE5->E5_VALOR
					dbSkip()
					Loop
				Endif
			Endif
		Endif

		dbSelectArea("SE5")

		@ LI, 0 PSAY E5_DATA
		//	@ LI,12 PSAY SUBSTR(E5_HISTOR,1,30)
		@li,12 PSAY sUBsTR(E5_BENEF,1,40)

		cDoc := E5_NUMCHEQ

		IF Empty( cDoc )
			cDoc := E5_DOCUMEN
		Endif

		IF Len(Alltrim(E5_DOCUMEN)) + Len(Alltrim(E5_NUMCHEQ)) <= 19
			cDoc := Alltrim(E5_DOCUMEN) +if(!empty(Alltrim(E5_DOCUMEN)),"-"," ") + Alltrim(E5_NUMCHEQ )
		Endif

		If Substr( cDoc ,1, 1 ) == "*"
			dbSkip( )
			Loop
		Endif

		//	@ LI,043 PSAY IIF(AllTrim(cDoc) == ""," ",AllTrim(cDoc))
		@ LI,061 PSAY E5_PREFIXO+IIF(EMPTY(E5_PREFIXO)," ","-")+E5_NUMERO+;
		IIF(EMPTY(E5_PARCELA)," ","-")+E5_PARCELA

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³VerIfica se foi utilizada taxa contratada para moeda > 1          ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If mv_par06 > 1 .and. !Empty(E5_VLMOED2)
			If  E5_VALOR != E5_VLMOED2
				IF Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda) != E5_VLMOED2
					nTxMoeda := (E5_VALOR * RecMoeda(E5_DTDISPO,nMoedaBco)) / E5_VLMOED2
				Else
					nTxMoeda := RecMoeda(E5_DTDISPO,mv_par06)
				EndIf
				nTxMoeda :=if(nTxMoeda=0,1,nTxMoeda)
				nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,,nMoeda+1,,nTxMoeda),nMoeda)
			Else
				nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda)
			EndIf
		Else
			nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda)
		Endif

		IF E5_RECPAG="R"
			@ LI,78 PSAY  nValor	Picture tm(nValor,15,nMoeda)
			nSaldoAtu += nValor
			If Empty( E5_RECONC )
				aRecon[1][REC_NAO_CONCILIADO] += nValor
			Else
				aRecon[1][REC_CONCILIADO] += nValor
			EndIf
			If lSpbInUse
				//Adiantamentos sao sempre STR
				If E5_TIPO $ MVRECANT
					nSalSTR += nValor
				Else
					// Saldo STR ou transformados em STR
					If E5_MODSPB $ " 1" .or. (E5_MODSPB $ "2/3" .AND. Empty(E5_BLOQ))
						nSalSTR += nValor
					ElseIf E5_MODSPB == "2" //CIP
						nSalCIP += nValor
					ElseIf E5_MODSPB == "3" //COMP
						nSalCOMP += nValor
					Endif
				Endif
			Endif
		Else
			@ LI,94 PSAY nValor  Picture tm(nValor,15,nMoeda)
			nSaldoAtu -= nValor
			If Empty( E5_RECONC )
				aRecon[1][PAG_NAO_CONCILIADO] += nValor
			Else
				aRecon[1][PAG_CONCILIADO] += nValor
			EndIf
			If lSpbInUse
				//Adiantamentos sao sempre STR
				If E5_TIPO $ MVPAGANT
					nSalSTR -= nValor
				Else
					// Saldo STR ou transformados em STR
					If E5_MODSPB $ " 1" .or. (E5_MODSPB $ "2/3" .AND. Empty(E5_BLOQ))
						nSalSTR -= nValor
					ElseIf E5_MODSPB == "2" //CIP
						nSalCIP -= nValor
					ElseIf E5_MODSPB == "3" //COMP
						nSalCOMP -= nValor
					Endif
				Endif
			Endif
		Endif

		If TRIM(SE5->E5_MOTBX) == "BOL"
			_nTotBol := _nTotBol + nValor
		Endif


		_nTotRecF := _nTotRecF + nValor
		@li,96 PSAY SE5->E5_MOTBX

		If SE5->E5_VLDESCO != 0   
			@li,101 PSAY "DESCONTO.:" + Transform(SE5->E5_VLDESCO,"@RE 999,999.99")
		Endif
		//	@ li++,pCol()PSAY Iif(Empty(E5_RECONC), " ", "x")

		If Len(Alltrim(E5_HISTOR)) > 30
			//		@li ++,12 PSAY SUBSTR(E5_HISTOR,31,30)
		Endif
		li++

		dbSelectArea("SE5")

		dbSkip()
	EndDO

	li+=2
	@li,000 PSAY "--- Total Recebido Fiado          "
	@li,078 PSAY _nTotRecF Picture tm(nSaldoIni,16,nMoeda)
	li+=2

	// Bloco PARA IMPRIMIR OUTROS CREDITOS
	cabec1 := "--- Recebimento Diversos --- " + OemToAnsi('BANCO: ') + cBanco +" - " + ALLTRIM(cNomeBanco) + OemToAnsi(' AGENCIA: ')+ cAgencia + OemToAnsi(' CONTA: ')+ cConta  //"BANCO "###"   AGENCIA "###"   CONTA "
	cabec2 := OemToAnsi("DATA        BENEFICIARIO                                    PREFIXO/TITULO              VALOR   MOT BAIXA   ")

	If li >=59
		cabec(@titulo,cabec1,cabec2,nomeprog,tamanho,nTipo)
	Else
		@li,000 PSAY Replicate("-",132)
		li+=2
		@li,000 PSAY "--- Recebimento Diversos  "
		li+=2
	Endif

	dbSeek(cFil+"R"+DtoS(mv_par04),.T.)
	_nTotDiv := 0
	While &(cCondWhile) .And. SE5->E5_RECPAG == "R"

		IncRegua()

		IF li >=59
			cabec(@titulo,cabec1,cabec2,nomeprog,tamanho,nTipo)
			@li,000 PSAY "--- Recebimento Diversos  "
			li+=2
		EndIF

		If SE5->E5_MOTBX != "BOL"
			If !Fr470Skip(cBanco,cAgencia,cConta)
				dbSkip()
				Loop
			EndIf
		Endif

		If Trim(SE5->E5_SITUACA) == "C" .Or. Trim(SE5->E5_SITUACA) == "X" .Or. Trim(SE5->E5_SITUACA) == "E" .Or. (Trim(SE5->E5_TIPODOC) == "RA" .And. !Empty(SE5->E5_KEY))
		   /* Ignorar Títulos de RA que possuem Estorno/Cancelamento - Sergio Coelho (Inovatuva) 23/01/2020 10:00 */
		   

			dbSkip()
			Loop
		Endif

		IF E5_MOEDA $ "C1/C2/C3/C4/C5/CH" .and. Empty(E5_NUMCHEQ) .and. !(E5_TIPODOC $ "TR#TE")
			dbSkip()
			Loop
		Endif

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Na transferencia somente considera nestes numerarios 		  ³
		//³ No Fina100 ‚ tratado desta forma.                    		  ³
		//³ As transferencias TR de titulos p/ Desconto/Cau‡Æo (FINA060) ³
		//³ nÆo sofrem mesmo tratamento dos TR bancarias do FINA100      ³
		//³ Aclaracao : Foi incluido o tipo $ para os movimentos en di-- ³
		//³ nheiro em QUALQUER moeda, pois o R$ nao e representativo     ³
		//³ fora do BRASIL. Bruno 07/12/2000 Paraguai                    ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If E5_TIPODOC $ "TR/TE" .and. Empty(E5_NUMERO)
			If !(E5_MOEDA $ "R$/DO/TB/TC/CH"+IIf(cPaisLoc=="BRA","","/$ "))
				dbSkip()
				Loop
			Endif
		Endif

		If E5_TIPODOC $ "TR/TE" .and. (Substr(E5_NUMCHEQ,1,1)=="*" ;
		.or. Substr(E5_DOCUMEN,1,1) == "*" )
			dbSkip()
			Loop
		Endif

		If E5_MOEDA == "CH" .and. IsCaixaLoja(E5_BANCO)		// Sangria
			dbSkip()
			Loop
		Endif

		If !Empty( E5_MOTBX ) .And. Trim(E5_MOTBX) != "BOL"
			If !MovBcoBx( E5_MOTBX )
				dbSkip( )
				Loop
			EndIf
		EndIf

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Considera filtro do usuario                                  ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If !Empty(cFilterUser).and.!(&cFilterUser)
			dbSkip()
			Loop
		Endif

		If !Empty( E5_MOTBX )
			dbSkip( )
			Loop
		EndIf

		SZ4->(dbSetOrder(1))
		SZ4->(dbGoTop())
		If SZ4->(dbSeek( xFilial("SZ4") + SE5->E5_NUMERO ))
			If SZ4->Z4_COND == "001"
				_nTotVis := _nTotVis + SE5->E5_VALOR
				dbSkip()
				Loop
			Endif
		Endif

		dbSelectArea("SE5")

		@ LI, 0 PSAY E5_DATA
		@ LI,12 PSAY SUBSTR(E5_HISTOR,1,30)+" "+SubStr(E5_BENEF,1,15)

		cDoc := E5_NUMCHEQ

		IF Empty( cDoc )
			cDoc := E5_DOCUMEN
		Endif

		IF Len(Alltrim(E5_DOCUMEN)) + Len(Alltrim(E5_NUMCHEQ)) <= 19
			cDoc := Alltrim(E5_DOCUMEN) +if(!empty(Alltrim(E5_DOCUMEN)),"-"," ") + Alltrim(E5_NUMCHEQ )
		Endif

		If Substr( cDoc ,1, 1 ) == "*"
			dbSkip( )
			Loop
		Endif

		//	@ LI,043 PSAY IIF(AllTrim(cDoc) == ""," ",AllTrim(cDoc))
		@ LI,061 PSAY E5_PREFIXO+IIF(EMPTY(E5_PREFIXO)," ","-")+E5_NUMERO+;
		IIF(EMPTY(E5_PARCELA)," ","-")+E5_PARCELA

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³VerIfica se foi utilizada taxa contratada para moeda > 1          ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If mv_par06 > 1 .and. !Empty(E5_VLMOED2)
			If  E5_VALOR != E5_VLMOED2
				IF Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda) != E5_VLMOED2
					nTxMoeda := (E5_VALOR * RecMoeda(E5_DTDISPO,nMoedaBco)) / E5_VLMOED2
				Else
					nTxMoeda := RecMoeda(E5_DTDISPO,mv_par06)
				EndIf
				nTxMoeda :=if(nTxMoeda=0,1,nTxMoeda)
				nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,,nMoeda+1,,nTxMoeda),nMoeda)
			Else
				nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda)
			EndIf
		Else
			nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda)
		Endif

		IF E5_RECPAG="R"
			@ LI,78 PSAY  nValor	Picture tm(nValor,15,nMoeda)
			nSaldoAtu += nValor
			If Empty( E5_RECONC )
				aRecon[1][REC_NAO_CONCILIADO] += nValor
			Else
				aRecon[1][REC_CONCILIADO] += nValor
			EndIf
			If lSpbInUse
				//Adiantamentos sao sempre STR
				If E5_TIPO $ MVRECANT
					nSalSTR += nValor
				Else
					// Saldo STR ou transformados em STR
					If E5_MODSPB $ " 1" .or. (E5_MODSPB $ "2/3" .AND. Empty(E5_BLOQ))
						nSalSTR += nValor
					ElseIf E5_MODSPB == "2" //CIP
						nSalCIP += nValor
					ElseIf E5_MODSPB == "3" //COMP
						nSalCOMP += nValor
					Endif
				Endif
			Endif
		Else
			@ LI,94 PSAY nValor  Picture tm(nValor,15,nMoeda)
			nSaldoAtu -= nValor
			If Empty( E5_RECONC )
				aRecon[1][PAG_NAO_CONCILIADO] += nValor
			Else
				aRecon[1][PAG_CONCILIADO] += nValor
			EndIf
			If lSpbInUse
				//Adiantamentos sao sempre STR
				If E5_TIPO $ MVPAGANT
					nSalSTR -= nValor
				Else
					// Saldo STR ou transformados em STR
					If E5_MODSPB $ " 1" .or. (E5_MODSPB $ "2/3" .AND. Empty(E5_BLOQ))
						nSalSTR -= nValor
					ElseIf E5_MODSPB == "2" //CIP
						nSalCIP -= nValor
					ElseIf E5_MODSPB == "3" //COMP
						nSalCOMP -= nValor
					Endif
				Endif
			Endif
		Endif


		_nTotDiv := _nTotDiv + nValor
		@li,113 PSAY SE5->E5_MOTBX
		//	@ li++,pCol()PSAY Iif(Empty(E5_RECONC), " ", "x")

		If Len(Alltrim(E5_HISTOR)) > 30
			//		@li ++,12 PSAY SUBSTR(E5_HISTOR,31,30)
		Endif
		li++

		dbSelectArea("SE5")

		dbSkip()
	EndDO

	li+=2
	@li,000 PSAY "--- Total Recebido Diversos       "
	@li,078 PSAY _nTotdIV Picture tm(nSaldoIni,16,nMoeda)
	li+=2

	// Bloco PARA IMPRIMIR OS PAGAMENTOS E DESPESAS.

	If li >= 59
		cabec(@titulo,cabec1,cabec2,nomeprog,tamanho,nTipo)
	Else
		@li,000 PSAY Replicate("-",132)
		li+=2
		@li,000 PSAY "--- Despesas Gerais E Pagamento Diversos "
		li+=2
	Endif


	If _lFech
		titulo := "Fechamento Caixa Diario - ENCERRADO -  "+DTOC(mv_par04) + " e " +Dtoc(mv_par05)  //"EXTRATO BANCARIO ENTRE "
	Else
		titulo := "Fechamento Caixa Diario "+DTOC(mv_par04) + " e " +Dtoc(mv_par05)  //"EXTRATO BANCARIO ENTRE "
	Endif
	cabec1 := OemToAnsi('BANCO: ') + cBanco +" - " + ALLTRIM(cNomeBanco) + OemToAnsi(' AGENCIA: ')+ cAgencia + OemToAnsi(' CONTA: ')+ cConta  //"BANCO "###"   AGENCIA "###"   CONTA "
	cabec2 := OemToAnsi("DATA        BENEFICIARIO                                    PREFIXO/TITULO              VALOR   MOT BAIXA   ")
	dbSeek(cFil+"P"+DtoS(mv_par04),.T.)
	_nTotPre := 0
	_nTotPag := 0
	While &(cCondWhile) .And. SE5->E5_RECPAG == "P"

		IncRegua()

		If !Fr470Skip(cBanco,cAgencia,cConta)
			dbSkip()
			Loop
		EndIf

		If Trim(SE5->E5_SITUACA) == "C" .Or. Trim(SE5->E5_SITUACA) == "X" .Or. Trim(SE5->E5_SITUACA) == "E" .Or. Trim(SE5->E5_TIPODOC) == "ES"  .Or. (Trim(SE5->E5_TIPODOC) == "PA" .And. !Empty(SE5->E5_KEY))
		   /* Ignorar Títulos de RA que possuem Estorno/Cancelamento - Sergio Coelho (Inovatuva) 23/01/2020 10:00 */
		   

			dbSkip()
			Loop
		Endif

		IF E5_MOEDA $ "C1/C2/C3/C4/C5/CH" .and. Empty(E5_NUMCHEQ) .and. !(E5_TIPODOC $ "TR#TE")
			dbSkip()
			Loop
		Endif

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Na transferencia somente considera nestes numerarios 		  ³
		//³ No Fina100 ‚ tratado desta forma.                    		  ³
		//³ As transferencias TR de titulos p/ Desconto/Cau‡Æo (FINA060) ³
		//³ nÆo sofrem mesmo tratamento dos TR bancarias do FINA100      ³
		//³ Aclaracao : Foi incluido o tipo $ para os movimentos en di-- ³
		//³ nheiro em QUALQUER moeda, pois o R$ nao e representativo     ³
		//³ fora do BRASIL. Bruno 07/12/2000 Paraguai                    ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If E5_TIPODOC $ "TR/TE" .and. Empty(E5_NUMERO)
			If !(E5_MOEDA $ "R$/DO/TB/TC/CH"+IIf(cPaisLoc=="BRA","","/$ "))
				dbSkip()
				Loop
			Endif
		Endif
		If E5_TIPODOC $ "TR/TE" .and. (Substr(E5_NUMCHEQ,1,1)=="*" ;
		.or. Substr(E5_DOCUMEN,1,1) == "*" )
			dbSkip()
			Loop
		Endif

		If E5_MOEDA == "CH" .and. IsCaixaLoja(E5_BANCO)		// Sangria
			dbSkip()
			Loop
		Endif

		If !Empty( E5_MOTBX )
			If !MovBcoBx( E5_MOTBX )
				dbSkip( )
				Loop
			EndIf
		EndIf

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³ Considera filtro do usuario                                  ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If !Empty(cFilterUser).and.!(&cFilterUser)
			dbSkip()
			Loop
		Endif

		If TRIM(SE5->E5_NATUREZ) == "CHQPRE"
			_nTotPre := _nTotPre + SE5->E5_VALOR
			dbSkip()
			Loop
		Endif

		IF li >= 59
			cabec(@titulo,cabec1,cabec2,nomeprog,tamanho,nTipo)
			@li ++,113 PSAY nSaldoAtu   Picture tm(nSaldoAtu,16,nMoeda)
		EndIF

		dbSelectArea("SE5")

		@li, 0 PSAY E5_DATA
		@ LI,12 PSAY SUBSTR(E5_HISTOR,1,30)+" "+SubStr(E5_BENEF,1,15)

		cDoc := E5_NUMCHEQ

		IF Empty( cDoc )
			cDoc := E5_DOCUMEN
		Endif

		IF Len(Alltrim(E5_DOCUMEN)) + Len(Alltrim(E5_NUMCHEQ)) <= 19
			cDoc := Alltrim(E5_DOCUMEN) +if(!empty(Alltrim(E5_DOCUMEN)),"-"," ") + Alltrim(E5_NUMCHEQ )
		Endif

		If Substr( cDoc ,1, 1 ) == "*"
			dbSkip( )
			Loop
		Endif

		//	@li,043 PSAY IIF(AllTrim(cDoc) == ""," ",AllTrim(cDoc))

		@li,061 PSAY E5_PREFIXO+IIF(EMPTY(E5_PREFIXO)," ","-")+E5_NUMERO+;
		IIF(EMPTY(E5_PARCELA)," ","-")+E5_PARCELA

		//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
		//³VerIfica se foi utilizada taxa contratada para moeda > 1          ³
		//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
		If mv_par06 > 1 .and. !Empty(E5_VLMOED2)
			If  E5_VALOR != E5_VLMOED2
				IF Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda) != E5_VLMOED2
					nTxMoeda := (E5_VALOR * RecMoeda(E5_DTDISPO,nMoedaBco)) / E5_VLMOED2
				Else
					nTxMoeda := RecMoeda(E5_DTDISPO,mv_par06)
				EndIf
				nTxMoeda :=if(nTxMoeda=0,1,nTxMoeda)
				nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,,nMoeda+1,,nTxMoeda),nMoeda)
			Else
				nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda)
			EndIf
		Else
			nValor := Round(xMoeda(E5_VALOR,nMoedaBco,mv_par06,E5_DTDISPO,nMoeda+1),nMoeda)
		Endif

		IF E5_RECPAG="R"
			@li,78 PSAY  nValor	Picture tm(nValor,15,nMoeda)
			nSaldoAtu += nValor
			If Empty( E5_RECONC )
				aRecon[1][REC_NAO_CONCILIADO] += nValor
			Else
				aRecon[1][REC_CONCILIADO] += nValor
			EndIf
			If lSpbInUse
				//Adiantamentos sao sempre STR
				If E5_TIPO $ MVRECANT
					nSalSTR += nValor
				Else
					// Saldo STR ou transformados em STR
					If E5_MODSPB $ " 1" .or. (E5_MODSPB $ "2/3" .AND. Empty(E5_BLOQ))
						nSalSTR += nValor
					ElseIf E5_MODSPB == "2" //CIP
						nSalCIP += nValor
					ElseIf E5_MODSPB == "3" //COMP
						nSalCOMP += nValor
					Endif
				Endif
			Endif
		Else
			@li,94 PSAY nValor  Picture tm(nValor,15,nMoeda)
			nSaldoAtu -= nValor
			If Empty( E5_RECONC )
				aRecon[1][PAG_NAO_CONCILIADO] += nValor
			Else
				aRecon[1][PAG_CONCILIADO] += nValor
			EndIf
			If lSpbInUse
				//Adiantamentos sao sempre STR
				If E5_TIPO $ MVPAGANT
					nSalSTR -= nValor
				Else
					// Saldo STR ou transformados em STR
					If E5_MODSPB $ " 1" .or. (E5_MODSPB $ "2/3" .AND. Empty(E5_BLOQ))
						nSalSTR -= nValor
					ElseIf E5_MODSPB == "2" //CIP
						nSalCIP -= nValor
					ElseIf E5_MODSPB == "3" //COMP
						nSalCOMP -= nValor
					Endif
				Endif
			Endif
		Endif
		_nTotPag := _nTotPag + nValor
		@ li,113 PSAY TRIM(SE5->E5_NATUREZ)
		@li++


		If Len(Alltrim(E5_HISTOR)) > 30
			//		@li ++,12 PSAY SUBSTR(E5_HISTOR,31,30)
		Endif

		dbSelectArea("SE5")

		dbSkip()
	EndDO

	li+=2
	@li,000 PSAY "--- Total Pagamento "
	@li,078 PSAY _nTotPag Picture tm(nSaldoIni,16,nMoeda)
	li+=2

	If li >= 59
		cabec(@titulo,cabec1,cabec2,nomeprog,tamanho,nTipo)
	Else
		@li,000 PSAY Replicate("-",132)
		li+=2
	Endif
	dbSelectArea("SEF")
	dbSetOrder(12)
	dbseek( xFilial("SEF") + Dtos(mv_par04) ,.T.)
	_nTotChenef := 0
	_nTotChebom := 0
	While !Eof() .And. xFiliaL("SEF") == SEF->EF_FILIAL .And.  SEF->EF_DATA <= MV_PAR05
		If SEF->EF_DATA >= SEF->EF_VENCTO .AND. Trim(SEF->EF_CART) == "R" .AND. !Empty(SEF->EF_VENCTO)
			_nTotChebom := _nTotChebom + SEF->EF_VALOR
		Else
			If 	Trim(SEF->EF_CART) == "R" .And. (SEF->EF_EFETIV == "1" .or. SEF->EF_EFETIV == " ")
				_nTotChenef := _nTotChenef + SEF->EF_VALOR
			Endif
		Endif
		sef->( dbSkip())
	Enddo

	If !Empty(_nTotCheNef)

		If MsgYesNo( " Valor de Cheque Pre Recebido e nao efetivado de " + Transform(_nTotCheNeF,"@RE 999,999,999.99") + ". Efetiva Este Valor ?", "ATENÇÃO -> " + UPPER(ALLTRIM(CUSERNAME)) )

			IF RecLock("SE5",.T.)
				SE5->E5_FILIAL   := xFilial("SE5")
				SE5->E5_DATA     := dDataBase
				SE5->E5_MOEDA    := "M1"
				SE5->E5_VALOR    := _nTotChenef
				SE5->E5_NATUREZ  := "CHQPRE"
				SE5->E5_BANCO    := "CX1"
				SE5->E5_AGENCIA  := "00001"
				SE5->E5_CONTA    := "0000000001"
				SE5->E5_VENCTO	   := dDataBase
				SE5->E5_RECPAG   := "P"
				SE5->E5_HISTOR   := "CHEQUE PRE RECEBIDO NO DIA.             "
				SE5->E5_LA       := "S"
				SE5->E5_DTDIGIT  := dDataBase
				SE5->E5_RATEIO   := "N"
				SE5->E5_DTDISPO  := dDataBase
				SE5->E5_MODSPB   := "1"
				SE5->E5_FILORIG  := xFilial("SE5")
				msUnLock()
			Endif          
			//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
			//³ Atualiza Saldo Bancario												  ³
			//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
			AtuSalBco(SE5->E5_BANCO,SE5->E5_AGENCIA,SE5->E5_CONTA,SE5->E5_DATA,SE5->E5_VALOR,"-")

			dbSelectArea("SEF")
			dbSetOrder(08)
			dbseek( xFilial("SEF") + Dtos(mv_par04) ,.T.)
			While !Eof() .And. xFiliaL("SEF") == SEF->EF_FILIAL .And.  SEF->EF_DATA <= MV_PAR05
				If SEF->EF_DATA < SEF->EF_VENCTO.And. Trim(SEF->EF_CART) == "R" .And. (SEF->EF_EFETIV == "1" .or. SEF->EF_EFETIV == " ")
					If RecLock("SEF",.F.)
						SEF->EF_EFETIV := "2"
						MSUnlock()
					Endif
				Endif
				dbSkip()
			Enddo


		Endif

		_nToTPre += _nTotCheNef


	Endif


	//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
	//³ Saldo de Partida 														  ³
	//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
	dbSelectArea("SE8")
	dbSetOrder(1)
	dbSeek( cFilial+cBanco+cAgencia+cConta+Dtos(mv_par04),.T.)
	dbSkip(-1)

	IF E8_BANCO!=cBanco .or. E8_AGENCIA!=cAgencia .or. E8_CONTA!=cConta .or. BOF() .or. EOF()
		nSaldoAtu:=0
		nSaldoIni:=0
	Else
		nSaldoAtu:=Round(xMoeda(E8_SALATUA,nMoedaBco,mv_par06,SE8->E8_DTSALAT,nMoeda+1),nMoeda)
		nSaldoIni:=Round(xMoeda(E8_SALATUA,nMoedaBco,mv_par06,SE8->E8_DTSALAT,nMoeda+1),nMoeda)
	Endif
	
//--------------------------------------------------------------------------------------------
_nVenVis := _nVenPrz := 0
nVendaOutros := 0

////////////////////////////////////////////////////////////////////////////////////////////
// INICIO - Calculando Venda a Prazo
////////////////////////////////////////////////////////////////////////////////////////////

IF CNUMEMP == '1404'

	If Select("SZ5TRB") > 0
   	dbSelectArea("SZ5TRB")
   	dbCloseArea()
	Endif

	_cQrSZ5 := " "
	_cQrSZ5 += " SELECT	"
	_cQrSZ5 += "  Z4_COND, Z5_PRECO, Z5_TOTAL " 
	_cQrSZ5 += " FROM " + RetSqlName("SZ5")+" SZ5 "
	_cQrSZ5 += " INNER JOIN " + RetSqlName("SZ4")+" SZ4 "
	_cQrSZ5 += "  ON SZ4.Z4_BILHETE = SZ5.Z5_BILHETE "
	_cQrSZ5 += " 	AND SZ4.Z4_FILIAL = '" + xFilial("SZ4")+"'"
	_cQrSZ5 += "  AND  SZ4.D_E_L_E_T_ = ''	"  
	_cQrSZ5 += " WHERE SZ5.D_E_L_E_T_ = ''	" 
	_cQrSZ5 += " 	AND SZ5.Z5_FILIAL = '" + xFilial("SZ5")+"'"
	_cQrSZ5 += "  AND SZ5.Z5_DATA BETWEEN '"+dTos(MV_PAR04)+"' AND '"+dTos(MV_PAR05)+"'"
	DbUseArea(.T.,"TOPCONN",TcGenQry(,,_cQrSZ5),"SZ5TRB",.T.,.T.)

  dbSelectArea("SZ5TRB")
  SZ5TRB->(dbGoTop())
  While SZ5TRB->(!Eof()) 
		If  (SZ5TRB->Z5_PRECO <= 0.10)  .OR. ( SZ5TRB->Z4_COND >= "900" .And. SZ5TRB->Z4_COND <= "997" )
				nVendaOutros += SZ5TRB->Z5_TOTAL 		//--> Venda Outros
		Else
			If AllTrim(SZ5TRB->Z4_COND) == "001" 	
				_nVenVis += SZ5TRB->Z5_TOTAL 	//--> Venda a Vista
			Endif                       
			If AllTrim(SZ5TRB->Z4_COND) != "001" .And. SubStr(SZ5TRB->Z4_COND,1,1) != "9" 	
				_nVenPrz += SZ5TRB->Z5_TOTAL	//--> Venda a Prazo 
			Endif
		Endif	
		SZ5TRB->(dbskip())
  Enddo
  SZ5TRB->(dbCloseArea()) 

    

ELSE
	_nVenVis := 0
	_nVenPrz := 0


	If Select("SZ5TRB") > 0
   	dbSelectArea("SZ5TRB")
   	dbCloseArea()
	Endif



	_cQrSZ5 := " "
	_cQrSZ5 += " SELECT	"
	_cQrSZ5 += "  Z4_COND, Z5_PRECO, Z5_PRECO, Z5_TOTAL " 
	_cQrSZ5 += " FROM " + RetSqlName("SZ5")+" SZ5 "
	_cQrSZ5 += " INNER JOIN " + RetSqlName("SZ4")+" SZ4 "
	_cQrSZ5 += "  ON SZ4.Z4_BILHETE = SZ5.Z5_BILHETE "
	_cQrSZ5 += " 	AND SZ4.Z4_FILIAL = '" + xFilial("SZ4")+"'"
	_cQrSZ5 += "  AND  SZ4.D_E_L_E_T_ = ''	"  
	_cQrSZ5 += " WHERE SZ5.D_E_L_E_T_ = ''	" 
	_cQrSZ5 += " 	AND SZ5.Z5_FILIAL = '" + xFilial("SZ5")+"'"
	_cQrSZ5 += "  AND SZ5.Z5_DATA BETWEEN '"+dTos(MV_PAR04)+"' AND '"+dTos(MV_PAR05)+"'"
	DbUseArea(.T.,"TOPCONN",TcGenQry(,,_cQrSZ5),"SZ5TRB",.T.,.T.)

	

  dbSelectArea("SZ5TRB")
  SZ5TRB->(dbGoTop())
  While SZ5TRB->(!Eof()) 
		If SZ5TRB->Z4_COND == "001"
			If SZ5TRB->Z5_PRECO > 0.10 
				_nVenVis+=SZ5TRB->Z5_TOTAL
			Endif   
		ElseIf SubStr(SZ5TRB->Z4_COND,1,1) != "9" .And. SZ5TRB->Z4_COND != "001"
			If SZ5TRB->Z5_PRECO > 0.10 
				_nVenPrz += SZ5TRB->Z5_TOTAL
			Endif	
		Endif
		SZ5TRB->(dbskip())
  Enddo
  SZ5TRB->(dbCloseArea()) 

ENDIF

////////////////////////////////////////////////////////////////////////////////////////////
// INICIO - Calculando Venda a Prazo
////////////////////////////////////////////////////////////////////////////////////////////


	dbSelectArea("SEF")
	dbSetOrder(8)
	dbGoTop()
	dbSeek(xFilial("SEF") + Dtos(mv_par04),.T.)

	If li >= 42
		cabec(@titulo,cabec1,cabec2,nomeprog,tamanho,nTipo)
	Endif


	_cAliasm := Alias()                

	_nTotChebom := 0
	If _nTotChebom > 0
		_nValCheque := _nTotChebom 
	Endif


	_lEfetiva := .F.

	dbSelectArea("SZ8")
	dbSetOrder(1)
	If dbSeek( xFilial("SZ8") + Dtos(dDataBase) )

		If Trim(SZ8->Z8_OBS) != "CAIXA FECHADO"

			If RecLock("SZ8",.F.)
				SZ8->Z8_DINHEIR := _nValDinhe
				SZ8->Z8_CHEQUE  := _nValCheque	
				SZ8->Z8_CC      := _nValCC    
				SZ8->Z8_CD      := _nValCD    
				SZ8->Z8_TICK    := _nValTK    
				SZ8->Z8_OUT     := _nValOU     
				If (_nTotRecF + nSaldoIni +_nVenVis + _nVenPRz + _nTotDiv) - (_nVenPrz + _nTotPag) == (_nValDinhe + _nValCheque + _nTotPre + _nTotBol +_nValCC + _nValCD + _nValTK + _nValOU  )

					SZN->(dbSetOrder(1))
					SZN->(dbGoTop())
					SZN->(dbSeek( xFilial("SZN") + Dtos(dDataBase) ) )
					_nTotSZN := 0
					_lTemSzn := .F.
					While !SZN->(Eof()) .And. SZN->ZN_DATA == dDataBase	 .And. SZN->ZN_FILIAL == xFilial("SZN")
						_lTemSzn := .T.
						_nTotSZN += SZN->ZN_VALOR
						SZN->(dbSkip())
					Enddo

					If _lTemSzn
						If _nTotSZN == _nValCC + _nValCD + _nValTK
							SZ8->Z8_OBS := "CAIXA CORRETO"
							_lEfetiva := .T.
						Else
							_lEfetiva := .F.
							SZ8->Z8_OBS := "CAIXA DIVERGENTE - ADM"
						Endif
					Else
						SZ8->Z8_OBS := "CAIXA CORRETO"
						_lEfetiva := .T.
					Endif	
				ElsE
					_lEfetiva := .F.
					SZ8->Z8_OBS := "CAIXA DIVERGENTE"
				Endif
				msUnLock()
			Endif
		Else
			_lEfetiva := .F.
			_nValDinhe := _ndi
			_nValCheque := _nch
			_nValCc     := _ncc
			_nValCd     := _ncd
			_nValtk     := _ntk
			_nValou     := _nou

		Endif

	eLSE

		If RecLock("SZ8",.T.)
			SZ8->Z8_DATA   := dDataBase
			SZ8->Z8_FILIAL := xFilial("SZ8")
			SZ8->Z8_DINHEIR := _nValDinhe
			SZ8->Z8_CHEQUE  := _nValCheque
			SZ8->Z8_CC      := _nValCC    
			SZ8->Z8_CD      := _nValCD    
			SZ8->Z8_TICK    := _nValTK    
			SZ8->Z8_OUT     := _nValOU     

			If (_nTotRecF + nSaldoIni +_nVenVis + _nVenPRz + _nTotDiv) - (_nVenPrz + _nTotPag) == (_nValDinhe + _nValCheque + _nTotPre + _nTotBol  +_nValCC + _nValCD + _nValTK + _nValOU )

				SZN->(dbSetOrder(1))
				SZN->(dbGoTop())
				SZN->(dbSeek( xFilial("SZN") + Dtos(dDataBase) ) )
				_nTotSZN := 0
				_lTemSzn := .F.
				While !SZN->(Eof()) .And. SZN->ZN_DATA == dDataBase	
					_lTemSzn := .T.
					_nTotSZN += SZN->ZN_VALOR
					SZN->(dbSkip())
				Enddo

				If _lTemSzn
					If _nTotSZN == _nValCC + _nValCD + _nValTK
						SZ8->Z8_OBS := "CAIXA CORRETO"
						_lEfetiva := .T.
					Else
						_lEfetiva := .F.
						SZ8->Z8_OBS := "CAIXA DIVERGENTE - ADM"
					Endif
				Else
					SZ8->Z8_OBS := "CAIXA CORRETO"
					_lEfetiva := .T.
				Endif	
			ElsE
				_lEfetiva := .F.
				SZ8->Z8_OBS := "CAIXA DIVERGENTE"
			Endif
			msUnLock()
		Endif   

	Endif


	dbSelectArea(_cAliasm)


	li+=1
	li+=1

	@li,008 PSAY "SALDO INICIAL...........: "
	@li,073 PSAY nSaldoIni	Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "RECEBIMENTOS DIVERSOS...: "
	@li,073 PSAY _nTotDiv  Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "VENDA PRAZO.............: "
	@li,073 PSAY _nVenPRz  Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "VENDA VISTA.............: "
	@li,073 PSAY _nVenVis  Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "RECEBIDO................: "
	@li,073 PSAY _nTotRecF Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "SUB-TOTAL...............: "
	@li,073 PSAY (_nTotRecF + nSaldoIni +_nVenVis + _nVenPRz + _nTotDiv) Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "VENDA FIADO.............: "
	@li,073 PSAY _nVenPRz  Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "DESPESAS................: "
	@li,073 PSAY _nTotPag  Picture tm(nSaldoIni,16,nMoeda)

	li+=1
	@li,008 PSAY "SUB-TOTAL...............: "
	@li,073 PSAY (_nVenPrz + _nTotPag) Picture tm(nSaldoIni,16,nMoeda)

	li+=2
	@li,008 PSAY "SALDO FINAL.............: "
	@li,073 PSAY (_nTotRecF + nSaldoIni +_nVenVis + _nVenPRz + _nTotDiv) - (_nVenPrz + _nTotPag) Picture tm(nSaldoIni,16,nMoeda)

	li+=2
	@li,008 PSAY "VALOR CHEQUE A VISTA....: "+ Transform(_nValCheque,"99,999,999,999,999,999.99")
	li+=1
	@li,008 PSAY "VALOR DINHEIRO RECEBIDO.: "+ Transform(_nValDinhe,"99,999,999,999,999,999.99")
	li+=1
	@li,008 PSAY "CHEQUE PRE CADAS DIA....: "+ Transform(_nTotPre,"99,999,999,999,999,999.99")
	li+=1
	@li,008 PSAY "RECEBIDO BOLETO.........: "+ Transform(_nTotBol,"99,999,999,999,999,999.99")
	li+=1
	@li,008 PSAY "VALOR CARTAO DE CREDITO.: "+ Transform(_nValCC,"99,999,999,999,999,999.99")
	li+=1
	@li,008 PSAY "VALOR CARTAO DE DEBITO..: "+ Transform(_nValCD,"99,999,999,999,999,999.99")
	li+=1
	@li,008 PSAY "VALOR TICKET............: "+ Transform(_nValTK,"99,999,999,999,999,999.99")
	li+=1
	@li,008 PSAY "VALOR OUTROS............: "+ Transform(_nValOU,"99,999,999,999,999,999.99")
	li+=2
	@li,008 PSAY "TOTAL VALORES ..........: "+Transform( (_nValCheque+_nValDinhe+_nTotPre+_nTotBol+_nValCC+_nValCD+_nValTK+_nValOU),"99,999,999,999,999,999.99")

	li+=2
	If Trim(SZ8->Z8_OBS) <> "CAIXA CORRETO" .AND. Trim(SZ8->Z8_OBS) <> "CAIXA FECHADO"
		If (_nValCheque+_nValDinhe+_nTotPre+_nTotBol+_nValCC+_nValCD+_nValTK+_nValOU) > ((_nTotRecF + nSaldoIni +_nVenVis + _nVenPRz + _nTotDiv) - (_nVenPrz + _nTotPag)) 
			@li,066 PSAY TRIM(SZ8->Z8_OBS)
			li+=1
			@li,066 PSAY "SOBRA DE " + Transform( (_nValCheque+_nValDinhe+_nTotPre+_nTotBol+_nValCC+_nValCD+_nValTK+_nValOU) - ((_nTotRecF + nSaldoIni +_nVenVis + _nVenPRz + _nTotDiv) - (_nVenPrz + _nTotPag)),"999,999,999.99")
		Else
			@li,066 PSAY TRIM(SZ8->Z8_OBS)
			li+=1
			@li,066 PSAY "FALTA DE " + Transform( ((_nTotRecF + nSaldoIni +_nVenVis + _nVenPRz + _nTotDiv) - (_nVenPrz + _nTotPag)) - (_nValCheque+_nValDinhe+_nTotPre+_nTotBol+_nValCC+_nValCD+_nValTK+_nValOU)  ,"999,999,999.99")
		Endif
	Else 
		@li,066 PSAY SZ8->Z8_OBS
	Endif



	//roda(cbcont,cbtxt,Tamanho)

	Set Device To Screen
	
	dbSelectArea("SE5")
	RetIndex( "SE5" )
	If !Empty(cIndex)
		FErase (cIndex+OrdBagExt())
	Endif
	dbSetOrder(1)

	If aReturn[5] = 1
		Set Printer To
		dbCommit()
		ourspool(wnrel)
	Endif

	MS_FLUSH()

	If _lEfetiva

		If ApMsgNoYes( " Deseja Efetivar Valor de CC, CD, TICKET e FECHAR CAIXA ?","FECHAR CAIXA ?", "ATENÇÃO -> " + UPPER(ALLTRIM(CUSERNAME)) )

			If RecLock("SZ8",.F.)
				SZ8->Z8_OBS := "CAIXA FECHADO"
				msUnLock()
			Endif   

			If !Empty(_nValCC+_nValCD+_nValTK+_nValOU) 

				IF ! Empty(_nValCC) .And. RecLock("SE5",.T.)	//--> Cartão de Credito
					SE5->E5_FILIAL   := xFilial("SE5")
					SE5->E5_DATA     := dDataBase
					SE5->E5_MOEDA    := "M1"
					SE5->E5_VALOR    := _nValCC
					SE5->E5_NATUREZ  := "CC"
					SE5->E5_BANCO    := "CX1"
					SE5->E5_AGENCIA  := "00001"
					SE5->E5_CONTA    := "0000000001"
					SE5->E5_VENCTO	   := dDataBase
					SE5->E5_RECPAG   := "P"
					SE5->E5_HISTOR   := "CARTAO DE CREDITO RECEBIDO NO DIA.             "
					SE5->E5_LA       := "S"
					SE5->E5_DTDIGIT  := dDataBase
					SE5->E5_RATEIO   := "N"
					SE5->E5_DTDISPO  := dDataBase
					SE5->E5_MODSPB   := "1"
					SE5->E5_FILORIG  := xFilial("SE5")
					msUnLock()
				Endif          

				IF ! Empty(_nValCD) .And. RecLock("SE5",.T.)	//--> Cartão de Debito
					SE5->E5_FILIAL   := xFilial("SE5")
					SE5->E5_DATA     := dDataBase
					SE5->E5_MOEDA    := "M1"
					SE5->E5_VALOR    := _nValCD
					SE5->E5_NATUREZ  := "CD"
					SE5->E5_BANCO    := "CX1"
					SE5->E5_AGENCIA  := "00001"
					SE5->E5_CONTA    := "0000000001"
					SE5->E5_VENCTO	   := dDataBase
					SE5->E5_RECPAG   := "P"
					SE5->E5_HISTOR   := "CARTAO DE DEBITO RECEBIDO NO DIA.             "
					SE5->E5_LA       := "S"
					SE5->E5_DTDIGIT  := dDataBase
					SE5->E5_RATEIO   := "N"
					SE5->E5_DTDISPO  := dDataBase
					SE5->E5_MODSPB   := "1"
					SE5->E5_FILORIG  := xFilial("SE5")
					msUnLock()
				Endif          

				IF ! Empty(_nValTK) .And. RecLock("SE5",.T.)	//--> Ticket
					SE5->E5_FILIAL   := xFilial("SE5")
					SE5->E5_DATA     := dDataBase
					SE5->E5_MOEDA    := "M1"
					SE5->E5_VALOR    := _nValTK
					SE5->E5_NATUREZ  := "TICKET"
					SE5->E5_BANCO    := "CX1"
					SE5->E5_AGENCIA  := "00001"
					SE5->E5_CONTA    := "0000000001"
					SE5->E5_VENCTO	   := dDataBase
					SE5->E5_RECPAG   := "P"
					SE5->E5_HISTOR   := "TICKET RECEBIDO NO DIA.             "
					SE5->E5_LA       := "N"
					SE5->E5_DTDIGIT  := dDataBase
					SE5->E5_RATEIO   := "N"
					SE5->E5_DTDISPO  := dDataBase
					SE5->E5_MODSPB   := "1"
					SE5->E5_FILORIG  := xFilial("SE5")
					msUnLock()
				Endif          

				IF ! Empty(_nValOU) .And. RecLock("SE5",.T.)	//--> OUTROS
					SE5->E5_FILIAL   := xFilial("SE5")
					SE5->E5_DATA     := dDataBase
					SE5->E5_MOEDA    := "M1"
					SE5->E5_VALOR    := _nValOU
					SE5->E5_NATUREZ  := "OUTROS"
					SE5->E5_BANCO    := "CX1"
					SE5->E5_AGENCIA  := "00001"
					SE5->E5_CONTA    := "0000000001"
					SE5->E5_VENCTO	   := dDataBase
					SE5->E5_RECPAG   := "P"
					SE5->E5_HISTOR   := "OUTROS RECEBIDO NO DIA.             "
					SE5->E5_LA       := "N"
					SE5->E5_DTDIGIT  := dDataBase
					SE5->E5_RATEIO   := "N"
					SE5->E5_DTDISPO  := dDataBase
					SE5->E5_MODSPB   := "1"
					SE5->E5_FILORIG  := xFilial("SE5")
					msUnLock()
				Endif     
				
				//ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿
				//³ Atualiza Saldo Bancario												  ³
				//ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ
				_cAliasSZN  := Alias()

				dbSelectArea("SZN")
				dbSetOrder(1)
				dbGoTop()
				dbSeek( xFilial("SZN") + Dtos(dDataBase) )
				_nParcelas := 1 
				While !Eof() .And. SZN->ZN_DATA == dDataBase

					IF SZN->ZN_VALOR <= 0
						dbSkip()
						Loop
					Endif

					SAE->(dbSetOrder(1))
					SAE->(dbGotop())
					SAE->(dbSeek( xFilial("SAE") + SZN->ZN_ADM ))

					SA1->(dbSetOrder(1))
					SA1->(dbGotop())
					SA1->(dbSeek( xFilial("SA1") + SAE->AE_CODCLI ))

					dbSelectArea("SE1")
					IF RecLock("SE1",.T.)
						SE1->E1_FILIAL   := xFilial("SE1")
						SE1->E1_PREFIXO  := SAE->AE_TIPO
						SE1->E1_NUM      := Dtos(dDataBase) 
						SE1->E1_PARCELA  := Str(_nParcelas,1)
						SE1->E1_TIPO     := "NF"
						SE1->E1_NATUREZ  := "CARTAO"
						SE1->E1_CLIENTE  := SA1->A1_COD
						SE1->E1_LOJA     := SA1->A1_LOJA
						SE1->E1_NOMCLI   := SA1->A1_NREDUZ
						SE1->E1_EMISSAO  := dDataBase
						SE1->E1_SITUACA  := "0"
						SE1->E1_VENCTO   := dDataBase  + SAE->AE_VENCTO 
						SE1->E1_VENCREA  := dDataBase  + SAE->AE_VENCTO
						SE1->E1_VENCORI  := dDataBase  + SAE->AE_VENCTO
						SE1->E1_STATUS   := "A"
						SE1->E1_VALOR    := SZN->ZN_VALOR // SZN->ZN_VALOR - Round( (SZN->ZN_VALOR * SAE->AE_TAXA) / 100,2) 
						SE1->E1_EMIS1    := dDataBase
						SE1->E1_MOEDA    := 1
						SE1->E1_VLCRUZ   := SZN->ZN_VALOR // SZN->ZN_VALOR - Round( (SZN->ZN_VALOR * SAE->AE_TAXA) / 100,2)
						SE1->E1_ORIGEM   := "RFINR02"
						SE1->E1_FLUXO    := "S"
						SE1->E1_TIPODES  := "1"
						SE1->E1_FILORIG  := xFilial("SE1")
						SE1->E1_MULTNAT  := "2"
						SE1->E1_MSFIL    := xFilial("SE1")
						SE1->E1_MSEMP    := SM0->M0_CODIGO
						SE1->E1_PROJPMS  := "2"
						SE1->E1_DESDOBR  := "2"
						SE1->E1_MODSPB   := "1"
						SE1->E1_MOEDA    := 1
						SE1->E1_SALDO    := SZN->ZN_VALOR // SZN->ZN_VALOR - Round( (SZN->ZN_VALOR * SAE->AE_TAXA) / 100,2)
						msUnLock()
					Endif
					_nParcelas++ 

					dbSelectArea("SZN")
					dbSkip()
				Enddo
				dbSelectArea(_cAliasSZN) 

				AtuSalBco(SE5->E5_BANCO,SE5->E5_AGENCIA,SE5->E5_CONTA,SE5->E5_DATA,SE5->E5_VALOR,"-")     
			Endif
		Endif	
	Endif

Return
/*/
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÚÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄ¿±±
±±³Fun‡„o	 ³Fr470Skip ³ Autor ³ Pilar S. Albaladejo	  ³ Data ³ 13.10.99 ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄ´±±
±±³Descri‡„o ³Pula registros de acordo com as condicoes (AS 400/CDX/ADS)  ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³ Uso		 ³ FINR470.PRX																  ³±±
±±ÀÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßßß
/*/
Static Function Fr470Skip(cBanco,cAgencia,cConta)
	Local lRet := .T.

	IF E5_TIPODOC $ "DC/JR/MT/CM/D2/J2/M2/C2/V2/CP/TL"  //Valores de Baixas
		lRet := .F.
	ElseIF E5_BANCO+E5_AGENCIA+E5_CONTA!=cBanco+cAgencia+cConta
		lRet := .F.
	ElseIF E5_SITUACA = "C"    //Cancelado
		lRet := .F.
	ElseIF E5_VALOR = 0
		lRet := .F.
		//	ElseIF E5_VENCTO > mv_par05 .or. E5_VENCTO > E5_DATA
		//		lRet := .F.
	ElseIf SubStr(E5_NUMCHEQ,1,1)=="*"
		lRet := .F.
	ElseIf (mv_par07 == 2 .and. Empty(E5_RECONC)) .or. (mv_par07 == 3 .and. !Empty(E5_RECONC))
		lRet := .F.
	ElseIF E5_TIPODOC = "BA"      //Baixa Automatica
		lRet := .F.
	Endif

Return lRet

/*
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÉÍÍÍÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍËÍÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍËÍÍÍÍÍÍÑÍÍÍÍÍÍÍÍÍÍÍÍÍ»±±
±±ºFunção    ³VALIDPERG º Autor ³ AP5 IDE            º Data ³  15/08/2001 º±±
±±ÌÍÍÍÍÍÍÍÍÍÍØÍÍÍÍÍÍÍÍÍÍÊÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÊÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍ¹±±
±±ºDescrição ³ Verifica a existencia das perguntas criando-as caso seja   º±±
±±º          ³ necessario (cafso nao existam).                             º±±
±±ÈÍÍÍÍÍÍÍÍÍÍÏÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ¼±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
*/

Static Function ValidPerg()

	Local _sAlias := Alias()
	Local aRegs := {}
	Local i,j

	dbSelectArea("SZ8")
	dbSetOrder(1)
	If dbSeek( xFilial("SZ8") + Dtos(dDataBase) )
		_ndi := SZ8->Z8_DINHEIR
		_nch := SZ8->Z8_CHEQUE
		_ncc := SZ8->Z8_CC    
		_ncd := SZ8->Z8_CD    
		_ntk := SZ8->Z8_TICK  
		_nOu := SZ8->Z8_OUT
	Endif

	dbselectarea("SX1")
	dbsetorder(1)     
	dbGoTop()
	If Len(SX1->X1_GRUPO) == 10
		cPerg := PADR(cPerg,10)
	Else
		cPerg := PADR(cPerg,6)
	Endif

	// Grupo/Ordem/Pergunta/Variavel/Tipo/Tamanho/Decimal/Presel/GSC/Valid/Var01/Def01/Cnt01/Var02/Def02/Cnt02/Var03/Def03/Cnt03/Var04/Def04/Cnt04/Var05/Def05/Cnt05
	aadd(aRegs, {cPerg,"01","Vlr Dinheiro" ,"Bilhete De  " ,"Bilhete De  " ,"mv_ch1","N",12,2,0,"G",""        ,"mv_par01","","","","","","","","","","","","","","","","","","","","","","","","",""})
	aadd(aRegs, {cPerg,"02","Vlr Cheque  " ,"Bilhete Ate " ,"Bilhete Ate " ,"mv_ch2","N",12,2,0,"G",""        ,"mv_par02","","","","","","","","","","","","","","","","","","","","","","","","",""})

	for i := 1 to len(aRegs)
		if ! dbseek(cPerg + aRegs[i][2])
			reclock("SX1",.T.)
			for j := 1 to fcount()
				if j <= len(aRegs[i])
					fieldput(j, aRegs[i][j])
				endif
			next j
			MsUnlock()       
		Else
			If SX1->X1_ORDEM == "01"
				If RecLock("SX1",.F.)
					SX1->X1_CNT01 := Str(_ndi,12,2)
					msUnLock()
				Endif
			ElseIf SX1->X1_ORDEM == "02"
				If RecLock("SX1",.F.)
					SX1->X1_CNT01 := Str(_nch,12,2)
					msUnLock()
				Endif

			ElseIf SX1->X1_ORDEM == "03"
				If RecLock("SX1",.F.)
					SX1->X1_CNT01 := Str(_ncc,12,2)
					msUnLock()
				Endif

			ElseIf SX1->X1_ORDEM == "04"
				If RecLock("SX1",.F.)
					SX1->X1_CNT01 := Str(_ncd,12,2)
					msUnLock()
				Endif
			ElseIf SX1->X1_ORDEM == "05"
				If RecLock("SX1",.F.)
					SX1->X1_CNT01 := Str(_ntk,12,2)
					msUnLock()
				Endif
			ElseIf SX1->X1_ORDEM == "06"
				If RecLock("SX1",.F.)
					SX1->X1_CNT01 := Str(_nou,12,2)
					msUnLock()
				Endif
			Endif	

		endif
	next i

	dbselectarea(_sAlias)
Return
//////////////////////////////////////////////////////////////////////////////////
/*ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÚÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄ¿±±
±±³Fun‡…o    | EscolhaPrd ³Autor ³ Paulo Bindo                 |Data ³ 30/01/12 ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄ´±±
±±³Descri‡ao | Monta a tela com os produtos sem cod. para que usuario escolha   ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³Parametros³ clCodFor  := Cod. Fornecedor/Cliente                             ³±±
±±³          | clLoja    := Loja                                                ³±±
±±³          | clNota    := Num. Nota                                           ³±±
±±³          | clSerie   := Serie                                               ³±±
±±³          | clTipo    := N = Nota fiscal Normal / B ou D = Benef./Devolucao  ³±±
±±³          | nlK       := Primeira posicao do acols encontrada sem Cod. Prod. ³±±
±±³          | nlPosCmp  := Posicao no aHeader do campo "DT_COD"                ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³Retorno   ³ llProcPrd = Se .T. = OK                                          ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³ Uso      ³ VldCpoProd                                                       ³±±
±±ÀÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ*/
Static Function ValorAdm(_dData,_nValCCa, _nValcDa,_nValTka)

	Local oOK := LoadBitmap(GetResources(),'br_verde')
	Local oNO := LoadBitmap(GetResources(),'br_vermelho')
	Local aList := {}
	Private aBrowse := {} , oDld,oBrowse
	Private _dDataBas := _dData
	Private _nValTotC :=  _nValCCa + _nValcDa + _nValTka



	DEFINE MSDIALOG oDlg TITLE "Fechamento Administradoras" FROM 180,180 TO 550,700 PIXEL

	dbSelectArea("SZN")
	dbSetOrder(1)
	dbGotop()
	dbSeek( xFilial("SZN") + Dtos(_dDataBas) )
	While !Eof() .And. _dDataBas == SZN->ZN_dATA
		Aadd( aBrowse, {SZN->ZN_ADM,SZN->ZN_NOMADM,SZN->ZN_VALOR})
		dbSkip()
	Enddo

	If Len(aBrowse) == 0
		dbSelectArea("SAE")
		dbSetOrder(1)
		dbGoTop()
		While !Eof()
			Aadd( aBrowse,{ SAE->AE_COD , SAE->AE_DESC , 0})
			dbSkip()
		Enddo
		dbSelectArea("SZN")
	Endif

	If Len(aBrowse) == 0
		Return(Nil)
	Endif 

	// Cria Browse
	oBrowse := TCBrowse():New( 01 , 01, 260, 156,,{'Codigo','Nome','Valor'},{50,50,50},oDlg,,,,,{||},,,,,,,.F.,,.T.,,.F.,,, )
	// Seta vetor para a browse
	oBrowse:SetArray(aBrowse)

	// Monta a linha a ser exibina no Browse
	oBrowse:bLine := {||{ aBrowse[oBrowse:nAt,01],aBrowse[oBrowse:nAt,02],Transform(aBrowse[oBrowse:nAT,03],'@E 99,999,999,999.99') } }

	// Evento de clique no cabeçalho da browse
	//oBrowse:bHeaderClick := {|o, nCol| alert('bHeaderClick') }

	// Evento de duplo click na celula
	//oBrowse:bLDblClick := {|| alert('bLDblClick') }
	oBrowse:bLDblClick := { || lEditCell(@aBrowse,oBrowse,'@E 99,999,999,999.99',3) }  
	// Cria Botoes com metodos básicos

	/*
	TButton():New( 160, 002, "GoUp()", oDlg,{|| oBrowse:GoUp(), oBrowse:setFocus() },40,010,,,.F.,.T.,.F.,,.F.,,,.F. )
	TButton():New( 160, 052, "GoDown()" , oDlg,{|| oBrowse:GoDown(), oBrowse:setFocus() },40,010,,,.F.,.T.,.F.,,.F.,,,.F. )
	TButton():New( 160, 102, "GoTop()" , oDlg,{|| oBrowse:GoTop(),oBrowse:setFocus()}, 40, 010,,,.F.,.T.,.F.,,.F.,,,.F.)
	TButton():New( 160, 152, "GoBottom()", oDlg,{|| oBrowse:GoBottom(),oBrowse:setFocus() },40,010,,,.F.,.T.,.F.,,.F.,,,.F.)
	TButton():New( 172, 002, "Linha atual", oDlg,{|| alert(oBrowse:nAt) },40,010,,,.F.,.T.,.F.,,.F.,,,.F. )
	TButton():New( 172, 052, "Nr Linhas", oDlg,{|| alert(oBrowse:nLen) },40,010,,,.F.,.T.,.F.,,.F.,,,.F. )
	TButton():New( 172, 102, "Linhas visiveis", oDlg,{|| alert(oBrowse:nRowCount()) },40,010,,,.F.,.T.,.F.,,.F.,,,.F.)
	TButton():New( 172, 152, "Alias", oDlg,{|| alert(oBrowse:cAlias) },40,010,,,.F.,.T.,.F.,,.F.,,,.F.)
	TButton():New( 172, 152, "lEditCell (Edita a celula)", oDlg, {|| lEditCell(@aBrowse,oBrowse,"@!",3) }, 90, 010,,,.F.,.T.,.F.,,.F.,,,.F. ) 
	*/

	@ 158,002 BMPBUTTON TYPE 1 ACTION( fiR2Ax01("1") )
	@ 172,002 BMPBUTTON TYPE 2 ACTION( fiR2Ax01("2") )

	ACTIVATE DIALOG oDlg CENTERED

RETURN(Nil)

/*ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
±±ÚÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÂÄÄÄÄÄÂÄÄÄÄÄÄÄÄÄÄ¿±±
±±³Fun‡…o    | EscolhaPrd ³Autor ³ Paulo Bindo                 |Data ³ 30/01/12 ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄ´±±
±±³Descri‡ao | Monta a tela com os produtos sem cod. para que usuario escolha   ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³Parametros³ clCodFor  := Cod. Fornecedor/Cliente                             ³±±
±±³          | clLoja    := Loja                                                ³±±
±±³          | clNota    := Num. Nota                                           ³±±
±±³          | clSerie   := Serie                                               ³±±
±±³          | clTipo    := N = Nota fiscal Normal / B ou D = Benef./Devolucao  ³±±
±±³          | nlK       := Primeira posicao do acols encontrada sem Cod. Prod. ³±±
±±³          | nlPosCmp  := Posicao no aHeader do campo "DT_COD"                ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³Retorno   ³ llProcPrd = Se .T. = OK                                          ³±±
±±ÃÄÄÄÄÄÄÄÄÄÄÅÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ´±±
±±³ Uso      ³ VldCpoProd                                                       ³±±
±±ÀÄÄÄÄÄÄÄÄÄÄÁÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ±±
±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±±
ÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜÜ*/
Static Function fiR2Ax01(_nOpcAux)

	Local _nx
	Local _nTotConf := 0

	If _nOpcAux == "1"

		For _nx := 1 To Len(aBrowse)

			dbSelectArea("SZN")
			dbSetOrder(1)
			dbGotop()
			If dbSeek( xFilial("SZN") +  Dtos(_dDataBas)+ aBrowse[_nx,1] )
				If Reclock("SZN",.F.)
					SZN->ZN_VALOR := aBrowse[_nx,3]
					msUnlock()
				Endif
			Else
				If Reclock("SZN",.T.)
					SZN->ZN_FILIAL := xFilial("SZN")
					SZN->ZN_ADM    := aBrowse[_nx,1]
					SZN->ZN_NOMADM := aBrowse[_nx,2]
					SZN->ZN_VALOR  := aBrowse[_nx,3]
					SZN->ZN_DATA   := _dDataBas
					msUnlock()
				Endif
			Endif

			_nTotConf += aBrowse[_nx,3]
		Next

		// valida soma 
		If _nTotConf <> _nValTotC
			Aviso("Atencao","Total Informado Nao Confere Com Valores de Fechamento de Caixa !!!",{"OK"})
		Else
			Close(oDlg)
		Endif	
	Else

		dbSelectArea("SZN")
		dbSetOrder(1)
		dbGotop()
		dbSeek( xFilial("SZN") +  Dtos(_dDataBas))
		While !Eof() .And. _dDataBas == SZN->ZN_dATA
			If Reclock("SZN",.F.)
				SZN->ZN_VALOR := 0
				msUnlock()
			Endif
			dbSkip()
		Enddo
		Close(oDlg)


	Endif

Return(Nil)

/*/{Protheus.doc} nomeFunction
	(long_description)
	@type user function
	@author FWNM
	@since 04/09/2024
	@version version
	@param param_name, param_type, param_descr
	@return return_var, return_type, return_description
	@example
	(examples)
	@see (links_or_references)
/*/
User Function ReabreCX()

	Local bProcess := { |oSelf| RunReabreCX(oSelf) }
	Local cDescri  := "Rotina para reabertura do caixinha"

	Private cTitulo  := "Reabre Caixinha"
	Private oProcess

    oProcess := tNewProcess():New("CAIXINHA",cTitulo,bProcess,cDescri,/*cPerg*/,, .T.,5, "RUNREABRECX", .T.)

Return

/*/{Protheus.doc} User Function nomeFunction
    (long_description)
    @type  Function
    @author fwnm
    @since since 04/09/2024
    @version version
    @param param_name, param_type, param_descr
    @return return_var, return_type, return_description
    @example
    (examples)
    @see (links_or_references)
    /*/
Static Function RunReabreCX(oProcess)

	Local lOk      := .t.
	Local _cUsrAut := GETMV("MV_#CXREAB",,"")

	Local cDescBox	:= "Infome as datas"
	Local dDataCX	:= CtoD("//")
	Local aParamBox := {}   
	Local aRet 		:= {}   

	If !(RetCodUsr() $ _cUsrAut)
		lOk := .f.
		messageBox("Login não autorizado! Verifique parâmetro MV_#CXREAB","Reabertura Caixinha",16)
		Return
	EndIf

	If lOk

		// parambox
		Aadd( aParamBox,{ 1, "Data Reabertura: ", dDataCX	,"","","","",80, .T. } )
		//Aadd( aParamBox,{ 2, "Tipo"     ,,{"E=Entradas","S=Saídas","A=Ambos"},100,"",.T.})

		//If ParamBox( aParamBox, cDescBox, @aRet ) // com opção salvar
		If ParamBox( aParamBox, cDescBox, @aRet, , , , , , , , .F., .F. ) // Sem opção salvar 

			dDataCX  := aRet[1]

			SZ8->( dbSetOrder(1) ) //Z8_FILIAL, Z8_DATA, R_E_C_N_O_, D_E_L_E_T_
			If SZ8->( dbSeek(FWxFilial("SZ8")+DtoS(dDataCX)) )

				If Upper(AllTrim(SZ8->Z8_OBS)) == "CAIXA FECHADO"

					//PutMV("FF_DTFCHAE",DtoS(dDataCX))
			        //PutMV("MV_DATAFIN",DtoS(dDataCX))

					RecLock("SZ8",.F.)
						SZ8->( dbDelete() )
					SZ8->( msUnLock() )

					messageBox("Caixinha reaberto com sucesso! Data: " + DtoC(dDataCX),"Reabertura Caixinha",8)

					cLog100 := "REABERTURA CAIXINHA"
					cLog200 := "CAIXINHA REABERTO COM SUCESSO - DATA: " + DtoC(dDataCX)
					u_GrvLogZLG( msDate(), TIME(), cUserName, cLog200, "FINANCEIRO", "REABRECX", cLog100, ComputerName(), LogUserName() )

				Else

					lOk := .f.
					messageBox("Caixa não está fechado nesta data! Verifique...","Reabertura Caixinha",16)

					cLog100 := "REABERTURA CAIXINHA"
					cLog200 := "DATA INFORMADA NAO ESTA FECHADA - DATA: " + DtoC(dDataCX)
					u_GrvLogZLG( msDate(), TIME(), cUserName, cLog200, "FINANCEIRO", "REABRECX", cLog100, ComputerName(), LogUserName() )

				EndIf
			
			Else

				lOk := .f.
				messageBox("Data não encontrada! Verifique se o fechamento foi realizado na tabela SZ8...","Reabertura Caixinha",16)

				cLog100 := "REABERTURA CAIXINHA"
				cLog200 := "DATA INFORMADA NAO ENCONTRADA " + DtoC(dDataCX)
				u_GrvLogZLG( msDate(), TIME(), cUserName, cLog200, "FINANCEIRO", "REABRECX", cLog100, ComputerName(), LogUserName() )

			EndIf

		EndIf

	Else
		cLog100 := "REABERTURA CAIXINHA"
		cLog200 := "LOGIN NAO AUTORIZADO"
		u_GrvLogZLG( msDate(), TIME(), cUserName, cLog200, "FINANCEIRO", "REABRECX", cLog100, ComputerName(), LogUserName() )
	EndIf

Return 
