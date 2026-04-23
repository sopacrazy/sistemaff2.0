
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Initializes the main dashboard tour.
 * This should be called from the main App or Home component on mount.
 */
export const initMainTour = () => {
    // Verifica se já viu o tutorial
    if (localStorage.getItem('tutorial_chamado_update_seen') === 'true') {
        return;
    }

    const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: false,
        doneBtnText: 'Entendi',
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        steps: [
            {
                element: '#btn-chamado-fab',
                popover: {
                    title: 'Nova Central de Chamados',
                    description: 'Agora seus chamados estão centralizados aqui! Clique neste botão para acessar o suporte e suas conversas.',
                    side: 'left',
                    align: 'center'
                }
            }
        ],
        onDestroyStarted: () => {
            // Se o usuário fechar ou terminar, marcamos como visto
            localStorage.setItem('tutorial_chamado_update_seen', 'true');
            driverObj.destroy();
        }
    });

    // Inicia o tour após um pequeno delay para garantir renderização
    setTimeout(() => {
        driverObj.drive();
    }, 1500);
};

/**
 * Initializes the modal-specific tour.
 * This should be called inside ChamadoModal when it opens.
 */
export const initModalTour = () => {
    console.log("Iniciando tour do modal...");
    // Verifica se usuário optou por não ver mais
    if (localStorage.getItem('tutorial_modal_opt_out_v2') === 'true') {
        console.log("Tour bloqueado pelo usuário (opt-out).");
        return;
    }

    const driverObj = driver({
        showProgress: true,
        animate: true,
        doneBtnText: 'Concluir',
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        steps: [
            {
                element: '#chamado-modal-container',
                popover: {
                    title: 'Bem-vindo à Central',
                    description: 'Aqui você pode abrir novos chamados e acompanhar suas solicitações em tempo real.',
                    side: 'bottom'
                }
            },
            {
                element: '#tab-novo-chamado',
                popover: {
                    title: 'Abrir Novo Chamado',
                    description: 'Use esta aba para relatar novos problemas ou solicitar serviços.',
                    side: 'bottom'
                }
            },
            {
                element: '#tab-historico',
                popover: {
                    title: 'Histórico e Chat',
                    description: `
                        Clique aqui para ver seus chamados anteriores. Ao selecionar um chamado, você terá acesso ao CHAT direto com o suporte!
                        <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
                                <input type="checkbox" id="driver-dont-show-again" style="cursor: pointer;">
                                Não mostrar este tutorial novamente
                            </label>
                        </div>
                    `,
                    side: 'bottom'
                }
            }
        ],
        onDestroyStarted: () => {
            const checkbox = document.getElementById('driver-dont-show-again');
            if (checkbox && checkbox.checked) {
                localStorage.setItem('tutorial_modal_opt_out_v2', 'true');
            }
            driverObj.destroy();
        }
    });

    // Inicia o tour
    setTimeout(() => {
        driverObj.drive();
    }, 800);
};
