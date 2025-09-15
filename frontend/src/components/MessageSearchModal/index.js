import React, { useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  List,
  ListItem,
  //ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  //Divider,
  InputAdornment,
  //Paper
} from "@material-ui/core";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Message as MessageIcon
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import useMessageSearch from "../../hooks/useMessageSearch/";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    width: "100%",
    maxWidth: 600,
    height: "90vh",
    margin: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      width: "100vw",
      height: "100vh",
      margin: 0,
      maxWidth: "none",
      maxHeight: "none"
    }
  },
  dialogTitle: {
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(1),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  searchField: {
    margin: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  messagesList: {
    flex: 1,
    overflow: "auto",
    maxHeight: "calc(90vh - 140px)",
    [theme.breakpoints.down("sm")]: {
      maxHeight: "calc(100vh - 140px)"
    }
  },
  messageItem: {
    cursor: "pointer",
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:hover": {
      backgroundColor: theme.palette.action.hover
    },
    padding: theme.spacing(2),
    alignItems: "flex-start"
  },
  messageContent: {
    flex: 1,
    minWidth: 0
  },
  messageBody: {
    fontSize: "0.9rem",
    lineHeight: 1.4,
    color: theme.palette.text.primary,
    wordBreak: "break-word",
    marginBottom: theme.spacing(0.5)
  },
  messageMetadata: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5)
  },
  senderName: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
    fontWeight: 500
  },
  messageDate: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary
  },
  fromMeChip: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontSize: "0.7rem",
    height: 20
  },
  fromContactChip: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.text.primary,
    fontSize: "0.7rem",
    height: 20
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(2)
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(4),
    textAlign: "center",
    color: theme.palette.text.secondary
  },
  searchStats: {
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.grey[100],
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontSize: "0.8rem",
    color: theme.palette.text.secondary
  },
  highlightTerm: {
    backgroundColor: theme.palette.secondary.light,
    padding: "2px 4px",
    borderRadius: 2,
    fontWeight: "bold"
  }
}));

const MessageSearchModal = ({ 
  open, 
  onClose, 
  ticketId, 
  onMessageClick,
  contactName,
  setModalSearchTerm
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  const {
    searchTerm,
    setSearchTerm,
    messages,
    loading,
    hasMore,
    totalCount,
    error,
    loadMore,
    clearSearch,
    isSearching
  } = useMessageSearch(ticketId);

  // Auto focus no input quando abrir o modal
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [open]);

  // Scroll infinito
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Formatar data da mensagem
  const formatMessageDate = (date) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, "HH:mm", { locale: ptBR });
    } else if (isYesterday(messageDate)) {
      return `Ontem ${format(messageDate, "HH:mm", { locale: ptBR })}`;
    } else {
      return format(messageDate, "dd/MM/yy HH:mm", { locale: ptBR });
    }
  };

  // Destacar termo de busca no texto
  const highlightSearchTerm = (text, term) => {
    if (!term || !text) return text;
    
    const normalizeText = (str) => str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    const normalizedText = normalizeText(text);
    const normalizedTerm = normalizeText(term);
    
    const index = normalizedText.indexOf(normalizedTerm);
    if (index === -1) return text;
    
    const beforeMatch = text.substring(0, index);
    const match = text.substring(index, index + term.length);
    const afterMatch = text.substring(index + term.length);
    
    return (
      <>
        {beforeMatch}
        <span className={classes.highlightTerm}>{match}</span>
        {highlightSearchTerm(afterMatch, term)}
      </>
    );
  };

  const handleMessageClick = (message) => {
    if (onMessageClick) {
      onMessageClick(message);
    }
    onClose();
  };

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  // Função para confirmar busca
  const handleSearchConfirm = (e) => {
    if (e.key === "Enter" && setModalSearchTerm) {
      setModalSearchTerm(searchTerm);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      PaperProps={{
        className: classes.dialogPaper
      }}
      maxWidth="md"
    >
      <DialogTitle className={classes.dialogTitle}>
        <Box display="flex" alignItems="center" gap={1}>
          <SearchIcon />
          <Typography variant="h6">
            Buscar Mensagens
          </Typography>
          {contactName && (
            <Typography variant="body2" color="textSecondary">
              - {contactName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        <TextField
          ref={searchInputRef}
          className={classes.searchField}
          placeholder="Digite para buscar mensagens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchConfirm}
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
        />

        {isSearching && totalCount > 0 && (
          <Box className={classes.searchStats}>
            <Typography variant="caption">
              {totalCount.toLocaleString()} mensagens encontradas
              {searchTerm && ` para "${searchTerm}"`}
            </Typography>
          </Box>
        )}

        <div 
          className={classes.messagesList}
          onScroll={handleScroll}
          ref={listRef}
        >
          {loading && messages.length === 0 ? (
            <Box className={classes.loadingContainer}>
              <CircularProgress size={40} />
            </Box>
          ) : messages.length === 0 && isSearching ? (
            <Box className={classes.emptyState}>
              <MessageIcon style={{ fontSize: 48, marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>
                Nenhuma mensagem encontrada
              </Typography>
              <Typography variant="body2">
                Tente usar palavras-chave diferentes
              </Typography>
            </Box>
          ) : messages.length === 0 ? (
            <Box className={classes.emptyState}>
              <SearchIcon style={{ fontSize: 48, marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>
                Buscar mensagens
              </Typography>
              <Typography variant="body2">
                Digite pelo menos 2 caracteres para começar a busca
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {messages.map((message, index) => (
                <ListItem
                  key={`${message.id}-${index}`}
                  className={classes.messageItem}
                  onClick={() => handleMessageClick(message)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {message.fromMe ? (
                        <PersonIcon />
                      ) : (
                        message.contact?.name?.charAt(0) || "?"
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <Box className={classes.messageContent}>
                    <Typography className={classes.messageBody} component="div">
                      {highlightSearchTerm(message.body, searchTerm)}
                    </Typography>
                    
                    <Box className={classes.messageMetadata}>
                      <Chip
                        size="small"
                        label={message.fromMe ? "Você" : (message.contact?.name || "Contato")}
                        className={message.fromMe ? classes.fromMeChip : classes.fromContactChip}
                      />
                      
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <ScheduleIcon style={{ fontSize: 12 }} />
                        <Typography className={classes.messageDate}>
                          {formatMessageDate(message.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </ListItem>
              ))}
              
              {loading && messages.length > 0 && (
                <Box className={classes.loadingContainer}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </List>
          )}
        </div>

        {error && (
          <Box p={2}>
            <Typography color="error" variant="body2" align="center">
              {error}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MessageSearchModal;