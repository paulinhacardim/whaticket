import React, { useState } from "react";
import {
  IconButton,
  Tooltip
} from "@material-ui/core";
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon
} from "@material-ui/icons";

import MessageSearchModal from "../MessageSearchModal/";

const TicketHeader = ({ ticket, contact, setModalSearchTerm, ...otherProps }) => {
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const handleMessageClick = (message) => {

    console.log("Navegar para mensagem:", message);
    
    
    const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
   
      messageElement.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 3000);
    }
  };

  return (
    <div className="ticket-header"> 
      {/* Conteúdo existente do header */}
      <div className="ticket-header-info">
        {/* Informações do contato, etc. */}
      </div>
      
      <div className="ticket-header-actions">
        {/* Botão de busca - adicionar ANTES dos 3 pontinhos */}
        <Tooltip title="Buscar mensagens">
          <IconButton 
            onClick={() => setSearchModalOpen(true)}
            color="inherit"
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>
        
        {/* Botão dos 3 pontinhos existente */}
        <IconButton color="inherit">
          <MoreVertIcon />
        </IconButton>
      </div>

      {/* Modal de busca */}
      {console.log("ticketId passado para o modal:", ticket?.id)}
      <MessageSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        ticketId={ticket?.id}
        onMessageClick={handleMessageClick}
        contactName={contact?.name}
        setModalSearchTerm={setModalSearchTerm}
      />
    </div>
  );
};

export default TicketHeader;