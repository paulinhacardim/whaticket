import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Drawer,
  IconButton,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { format } from "date-fns";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
    display: "flex",
    flexDirection: "column",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
    borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
    borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
  },
  header: {
    display: "flex",
    borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
    backgroundColor: "#eee",
    alignItems: "center",
    padding: theme.spacing(0, 1),
    minHeight: "73px",
  },
  content: {
    flex: 1,
    padding: "8px",
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
}));

const MessageSearchDrawer = ({ open, handleDrawerClose, ticketId }) => {
  const classes = useStyles();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // debounce da busca
  useEffect(() => {
    const handler = setTimeout(() => {
      if (term.trim()) {
        setLoading(true);
        fetch(`/api/messages/search?ticketId=${ticketId}&term=${term}&page=1`)
          .then(res => res.json())
          .then(setResults)
          .finally(() => setLoading(false));
      } else {
        setResults([]);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [term, ticketId]);

  const handleClickMessage = (messageId) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    handleDrawerClose();
  };

  return (
    <Drawer
      className={classes.drawer}
      variant="persistent"
      anchor="right"
      open={open}
      classes={{ paper: classes.drawerPaper }}
    >
      <div className={classes.header}>
        <IconButton onClick={handleDrawerClose}>
          <CloseIcon />
        </IconButton>
        <Typography>Buscar mensagens</Typography>
      </div>

      <div className={classes.content}>
        <TextField
          fullWidth
          label="Digite para buscar"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />

        {loading && <CircularProgress size={24} />}

        <List>
          {results.map((msg) => (
            <ListItem
              button
              key={msg.id}
              onClick={() => handleClickMessage(msg.id)}
            >
              <ListItemText
                primary={msg.body}
                secondary={format(new Date(msg.createdAt), "dd/MM/yyyy HH:mm")}
              />
            </ListItem>
          ))}
        </List>
      </div>
    </Drawer>
  );
};

export default MessageSearchDrawer;
