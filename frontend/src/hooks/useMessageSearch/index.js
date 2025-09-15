import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

const useMessageSearch = (ticketId) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  // Debounce para otimizar as buscas (espera 1 segundo após parar de digitar)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset quando trocar de ticket
  useEffect(() => {
    setMessages([]);
    setPage(1);
    setHasMore(false);
    setTotalCount(0);
    setError(null);
  }, [ticketId]);



  // Função principal de busca
  const searchMessages = useCallback(async (resetPage = true) => {
    if (!debouncedSearchTerm.trim() || debouncedSearchTerm.length < 2) {
      setMessages([]);
      setHasMore(false);
      setTotalCount(0);
      return;
    }

    // Verifica se ticketId é válido
    if (!ticketId || isNaN(Number(ticketId))) {
      setMessages([]);
      setHasMore(false);
      setTotalCount(0);
      setError("ticketId inválido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentPage = resetPage ? 1 : page;

      const response = await api.get(`/search/`, {
        params: {
          searchTerm: debouncedSearchTerm,
          ticketId: Number(ticketId),
          page: currentPage,
          limit: 40
        }
      });

      console.log('API response:', response.data); // <-- log para testar retorno da API

      const { messages: newMessages, hasMore: more, count } = response.data;

      if (resetPage) {
        setMessages(newMessages);
        setPage(1);
      } else {
        setMessages(prev => [...prev, ...newMessages]);
      }

      setHasMore(more);
      setTotalCount(count);
      
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      setError("Erro ao buscar mensagens. Tente novamente.");
      setMessages([]);
      setHasMore(false);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [ ticketId, debouncedSearchTerm, page ]);

  // Carregar mais mensagens (scroll infinito)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    setPage(prev => {
      const nextPage = prev + 1;
      // Chama searchMessages com a próxima página
      setTimeout(() => searchMessages(false), 0);
      return nextPage;
    });
  }, [hasMore, loading, searchMessages]);

  // Buscar quando o termo de busca mudar
  useEffect(() => {
    searchMessages(true);
  }, [debouncedSearchTerm, ticketId, searchMessages]);

  // Limpar busca
  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setMessages([]);
    setPage(1);
    setHasMore(false);
    setTotalCount(0);
    setError(null);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    messages,
    loading,
    hasMore,
    totalCount,
    error,
    loadMore,
    clearSearch,
    isSearching: debouncedSearchTerm.length >= 2
  };
};

export default useMessageSearch;