export type Lang = 'pt' | 'en';

export const T = {
  // Navigation
  nav_news:        { pt: 'Notícias',   en: 'News'       },
  nav_games:       { pt: 'Jogos',      en: 'Games'      },
  nav_favorites:   { pt: 'Favoritos',  en: 'Favorites'  },
  nav_settings:    { pt: 'Configurações', en: 'Settings' },
  nav_subtitle:    { pt: 'Nintendo · Global', en: 'Nintendo · Global' },

  // Header / common
  refresh:         { pt: 'Atualizar',    en: 'Refresh'       },
  now:             { pt: 'agora mesmo',  en: 'just now'       },
  loading:         { pt: 'Carregando…',  en: 'Loading…'       },
  loadMore:        { pt: 'Carregar mais',en: 'Load more'      },
  loadingMore:     { pt: 'Buscando…',    en: 'Fetching…'      },
  back:            { pt: 'Voltar',       en: 'Back'           },
  save:            { pt: 'Salvar',       en: 'Save'           },
  cancel:          { pt: 'Cancelar',     en: 'Cancel'         },
  delete:          { pt: 'Excluir',      en: 'Delete'         },
  edit:            { pt: 'Editar',       en: 'Edit'           },
  add:             { pt: 'Adicionar',    en: 'Add'            },
  yes:             { pt: 'Sim',          en: 'Yes'            },
  no:              { pt: 'Não',          en: 'No'             },

  // News page
  news_title:      { pt: 'Notícias',       en: 'News'              },
  news_subtitle:   { pt: 'Nintendo · Global', en: 'Nintendo · Global' },
  more_news:       { pt: 'Mais notícias',  en: 'More news'         },
  read_article:    { pt: 'Ler artigo',     en: 'Read article'      },
  no_news:         { pt: 'Nenhuma notícia encontrada.', en: 'No news found.' },
  news_error:      { pt: 'Não foi possível carregar as notícias.', en: 'Could not load news.' },
  translate:       { pt: 'Traduzir',   en: 'Translate'   },
  original:        { pt: 'Original',   en: 'Original'    },

  // Games page
  games_title:         { pt: 'Jogos',                en: 'Games'                     },
  games_subtitle:      { pt: 'Nintendo Switch · AUD', en: 'Nintendo Switch · AUD'    },
  games_search:        { pt: 'Buscar qualquer jogo ou editora…', en: 'Search any game or publisher…' },
  tab_sale:            { pt: 'Em Promoção',    en: 'On Sale'          },
  tab_new:             { pt: 'Lançamentos',   en: 'New Releases'     },
  tab_popular:         { pt: 'Populares',     en: 'Popular'          },
  tab_all:             { pt: 'Todos',         en: 'All Games'        },
  tab_coming_soon:     { pt: 'Em Breve',      en: 'Coming Soon'      },
  coming_soon_release: { pt: 'Lançamento',    en: 'Release date'     },
  coming_soon_no_date: { pt: 'Data a confirmar', en: 'Date TBA'      },

  // OpenCritic
  opencritic_score:    { pt: 'Nota da Crítica', en: 'Critic Score'   },
  opencritic_tier_mighty: { pt: 'Excepcional', en: 'Mighty'         },
  opencritic_tier_strong: { pt: 'Forte',       en: 'Strong'         },
  opencritic_tier_fair:   { pt: 'Razoável',    en: 'Fair'           },
  opencritic_tier_weak:   { pt: 'Fraco',       en: 'Weak'           },

  // Game detail extras
  game_detail_screenshots: { pt: 'Screenshots',   en: 'Screenshots'  },
  game_detail_trailer:     { pt: 'Ver trailer',   en: 'Watch trailer' },
  sort_default:        { pt: 'Padrão',       en: 'Default'        },
  sort_discount:       { pt: 'Maior desconto', en: 'Biggest discount' },
  sort_price_asc:      { pt: 'Menor preço',  en: 'Lowest price'  },
  sort_price_desc:     { pt: 'Maior preço',  en: 'Highest price' },
  sort_name:           { pt: 'A–Z',          en: 'A–Z'           },
  no_games:            { pt: 'Nenhum jogo encontrado.', en: 'No games found.' },
  clear_search:        { pt: 'Limpar busca', en: 'Clear search'  },
  games_error:         { pt: 'Não foi possível carregar os jogos.', en: 'Could not load games.' },
  search_results_for:  { pt: 'Resultados para', en: 'Results for' },

  // Platform filter
  platform_all:     { pt: 'Todos',     en: 'All'       },
  platform_switch1: { pt: 'Switch',    en: 'Switch'    },
  platform_switch2: { pt: 'Switch 2',  en: 'Switch 2'  },

  // Game card
  platform_switch:  { pt: 'Switch',    en: 'Switch'         },
  platform_switch2_tag: { pt: 'Switch 2', en: 'Switch 2'    },
  ends_today:       { pt: 'Termina hoje',   en: 'Ends today'    },
  ends_tomorrow:    { pt: 'Termina amanhã', en: 'Ends tomorrow' },
  ends_in_days:     { pt: 'Termina em',     en: 'Ends in'       },
  days:             { pt: 'dias',           en: 'days'           },
  historical_low:   { pt: 'Mínimo histórico', en: 'Historical low' },
  current_sale:     { pt: 'Promoção atual',   en: 'Current sale'   },
  regular_price:    { pt: 'Preço regular',    en: 'Regular price'  },
  prices_in_aud:    { pt: 'Preços em AUD',    en: 'Prices in AUD'  },
  price_tba:        { pt: 'Preço a confirmar', en: 'Price TBA'      },

  // Game detail
  game_detail_back:       { pt: 'Voltar aos Jogos',   en: 'Back to Games'      },
  game_detail_eshop:      { pt: 'Ver na eShop',       en: 'View on eShop'      },
  game_detail_description:{ pt: 'Sobre o Jogo',       en: 'About This Game'    },
  game_detail_info:       { pt: 'Informações',        en: 'Details'            },
  game_detail_price:      { pt: 'Preço Atual',        en: 'Current Price'      },
  game_detail_price_chart:{ pt: 'Histórico de Preço', en: 'Price History'      },
  game_detail_chart_start:{ pt: 'Rastreando desde',   en: 'Tracking since'     },
  game_detail_no_history: { pt: 'Histórico indisponível', en: 'No history yet' },
  game_detail_publisher:  { pt: 'Publicadora',        en: 'Publisher'          },
  game_detail_developer:  { pt: 'Desenvolvedora',     en: 'Developer'          },
  game_detail_released:   { pt: 'Lançamento',         en: 'Released'           },
  game_detail_rating:     { pt: 'Classificação',      en: 'Rating'             },
  game_detail_players:    { pt: 'Jogadores',          en: 'Players'            },
  game_detail_platforms:  { pt: 'Plataformas',        en: 'Platforms'          },
  game_detail_size:       { pt: 'Tamanho',            en: 'File Size'          },
  game_detail_languages:  { pt: 'Idiomas',            en: 'Languages'          },
  game_detail_categories: { pt: 'Categorias',         en: 'Categories'         },
  game_detail_series:     { pt: 'Série',              en: 'Series'             },
  game_detail_dlc:        { pt: 'Conteúdo adicional disponível', en: 'DLC & Add-on content available' },
  game_detail_digital:    { pt: 'Digital',            en: 'Digital'            },
  game_detail_physical:   { pt: 'Físico',             en: 'Physical'           },
  game_detail_demo:       { pt: 'Demo disponível',    en: 'Demo available'     },
  game_detail_not_priced: { pt: 'Sem preço na AU ainda', en: 'Not yet priced in AU' },

  // Favorites page
  fav_title:       { pt: 'Favoritos',         en: 'Favorites'          },
  fav_subtitle:    { pt: 'Seus jogos salvos',  en: 'Your saved games'   },
  fav_empty:       { pt: 'Nenhum favorito ainda', en: 'No favorites yet' },
  fav_cta:         { pt: 'Clique no ♥ em qualquer jogo para salvá-lo aqui.', en: 'Click ♥ on any game to save it here.' },
  browse_games:    { pt: 'Ver jogos',          en: 'Browse games'       },

  // Settings page
  settings_title:         { pt: 'Configurações',     en: 'Settings'             },
  settings_language:      { pt: 'Idioma',            en: 'Language'             },
  settings_language_desc: { pt: 'Idioma padrão da interface', en: 'Default interface language' },
  settings_sources:       { pt: 'Fontes de Notícias', en: 'News Sources'        },
  settings_sources_desc:  { pt: 'Gerencie de onde buscamos as notícias', en: 'Manage where we fetch news from' },
  settings_add_source:    { pt: 'Adicionar fonte',   en: 'Add source'           },
  settings_source_name:   { pt: 'Nome',              en: 'Name'                 },
  settings_source_url:    { pt: 'URL do Feed RSS',   en: 'RSS Feed URL'         },
  settings_source_delete: { pt: 'Remover',           en: 'Remove'               },
  settings_source_toggle: { pt: 'Ativar/desativar',  en: 'Toggle'               },
  settings_saved:         { pt: 'Salvo!',            en: 'Saved!'               },

  // Language toggle
  lang_toggle_pt:  { pt: 'PT', en: 'PT' },
  lang_toggle_en:  { pt: 'EN', en: 'EN' },

  // Time
  min_ago:  { pt: 'min',  en: 'min' },
  hour_ago: { pt: 'h',    en: 'h'   },
  day_ago:  { pt: 'd',    en: 'd'   },
  ago:      { pt: 'atrás',en: 'ago' },
  updated:  { pt: 'Atualizado', en: 'Updated' },
} as const;

export type TKey = keyof typeof T;

export function t(key: TKey, lang: Lang): string { return T[key][lang]; }
