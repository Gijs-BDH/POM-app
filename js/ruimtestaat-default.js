/* Default ruimtestaat layout — loaded when no saved state exists yet.
   Mirrors src/assets/ruimtestaat_compact.json as a JS constant so it
   works with file:// as well as http:// origins. */

const RUIMTESTAAT_DEFAULT = {
  clusters: [
    {
      name: "ClusterOnderbouw",
      verdiepingrestrictie: true,
      relations: [{ connection: "Centrale ruimten" }],
      rooms: [
        { name: "Bergruimte; algemeen",   aantal: "1", oppervlakte: "8"   },
        { name: "Toiletruimte; kinderen", aantal: "8", oppervlakte: "2.5" },
        { name: "Leerplein",              aantal: "1", oppervlakte: "18"  },
        { name: "Groepsruimte",           aantal: "6", oppervlakte: "60"  }
      ]
    },
    {
      name: "Middenbouw",
      verdiepingrestrictie: false,
      relations: [{ connection: "Centrale ruimten" }],
      rooms: [
        { name: "Toiletruimte; kinderen", aantal: "8", oppervlakte: "2.5" },
        { name: "Bergruimte; algemeen",   aantal: "1", oppervlakte: "8"   },
        { name: "Leerplein",              aantal: "1", oppervlakte: "18"  },
        { name: "Groepsruimte",           aantal: "6", oppervlakte: "52"  }
      ]
    },
    {
      name: "Bovenbouw",
      verdiepingrestrictie: false,
      relations: [{ connection: "Centrale ruimten" }],
      rooms: [
        { name: "Toiletruimte; kinderen", aantal: "8", oppervlakte: "2.5" },
        { name: "Leerplein",              aantal: "1", oppervlakte: "18"  },
        { name: "Bergruimte; algemeen",   aantal: "1", oppervlakte: "8"   },
        { name: "Groepsruimte",           aantal: "6", oppervlakte: "52"  }
      ]
    },
    {
      name: "Centrale ruimten",
      verdiepingrestrictie: true,
      relations: [
        { connection: "ClusterOnderbouw" },
        { connection: "Middenbouw" },
        { connection: "Bovenbouw" },
        { connection: "Personeel en ondersteuning" }
      ],
      rooms: [
        { name: "Techniekruimte",                       aantal: "1",  oppervlakte: "2"   },
        { name: "Patchkast/netwerkruimte ICT",          aantal: "1",  oppervlakte: "2"   },
        { name: "Meterkast",                            aantal: "1",  oppervlakte: "2"   },
        { name: "Bergruimte; speellokaal",              aantal: "1",  oppervlakte: "6"   },
        { name: "Toiletruimte; integraal toegankelijk", aantal: "1",  oppervlakte: "4"   },
        { name: "Werkkast",                             aantal: "2",  oppervlakte: "3"   },
        { name: "Hoofdentree/tochtportaal",             aantal: null, oppervlakte: "4"   },
        { name: "Prikkelarme plek(ken)",                aantal: "1",  oppervlakte: "12"  },
        { name: "Speellokaal",                          aantal: "1",  oppervlakte: "80"  },
        { name: "Centrale ontmoetingsruimte",           aantal: "1",  oppervlakte: "170" }
      ]
    },
    {
      name: "Personeel en ondersteuning",
      verdiepingrestrictie: false,
      relations: [{ connection: "Centrale ruimten" }],
      rooms: [
        { name: "Bergruimte; algemeen",    aantal: "1", oppervlakte: "12"  },
        { name: "Reprovoorziening",        aantal: "1", oppervlakte: "8"   },
        { name: "Onderwijsassistent",      aantal: "1", oppervlakte: "10"  },
        { name: "IB en ondersteuning",     aantal: "2", oppervlakte: "8"   },
        { name: "Spreekruimte",            aantal: "1", oppervlakte: "18"  },
        { name: "Teamruimte",              aantal: "1", oppervlakte: "60"  },
        { name: "Directiekantoor",         aantal: "1", oppervlakte: "10"  },
        { name: "Kantoorruimte",           aantal: "1", oppervlakte: "10"  },
        { name: "Toiletruimte; personeel", aantal: "4", oppervlakte: "2.5" }
      ]
    },
    {
      name: "Voorschoolse educatie",
      verdiepingrestrictie: true,
      relations: [],
      rooms: [
        { name: "Entree/tochtportaal",     aantal: "1", oppervlakte: "12"  },
        { name: "Stallingsruimte buggy's", aantal: "1", oppervlakte: "4"   },
        { name: "Garderobe; personeel",    aantal: "1", oppervlakte: "3"   },
        { name: "Bergruimte; algemeen",    aantal: "1", oppervlakte: "6"   },
        { name: "Toiletruimte; personeel", aantal: "1", oppervlakte: "2.5" },
        { name: "Toiletruimte; kinderen",  aantal: "2", oppervlakte: "3"   },
        { name: "Kantoor/spreekruimte",    aantal: "1", oppervlakte: "16"  },
        { name: "Toilet/verschoonruimte",  aantal: "1", oppervlakte: "12"  },
        { name: "Pantry groepsruimte(n)",  aantal: "1", oppervlakte: "8"   },
        { name: "Slaapruimte",             aantal: "1", oppervlakte: "16"  },
        { name: "Groepsruimte",            aantal: "2", oppervlakte: "55"  }
      ]
    },
    {
      name: "Gymzaal",
      verdiepingrestrictie: false,
      relations: [],
      rooms: [
        { name: "Meterkast",                                   aantal: "1", oppervlakte: "2"      },
        { name: "Patchkast/netwerkruimte ICT",                 aantal: "1", oppervlakte: "2"      },
        { name: "Techniekruimte",                              aantal: "1", oppervlakte: "6"      },
        { name: "Toilet/doucheruimte; integraal toegankelijk", aantal: "1", oppervlakte: "4"      },
        { name: "Toiletruimte; leerlingen",                    aantal: "3", oppervlakte: "2.5"    },
        { name: "Toiletruimte; leerlingen 2",                  aantal: "3", oppervlakte: "2.5"    },
        { name: "Toiletruimte; docent",                        aantal: "1", oppervlakte: "2.5"    },
        { name: "Doucheruimte; leerlingen",                    aantal: "3", oppervlakte: "4"      },
        { name: "Doucheruimte; leerlingen 2",                  aantal: "3", oppervlakte: "4"      },
        { name: "Doucheruimte; docent",                        aantal: "1", oppervlakte: "4"      },
        { name: "Kleedruimte; leerlingen",                     aantal: "1", oppervlakte: "40"     },
        { name: "Kleedruimte; leerlingen 2",                   aantal: "1", oppervlakte: "40"     },
        { name: "Werkkast",                                    aantal: "1", oppervlakte: "4"      },
        { name: "Bergruimte; toestellen",                      aantal: "1", oppervlakte: "60"     },
        { name: "Entree/tochtportaal",                         aantal: "1", oppervlakte: "12"     },
        { name: "Werkplek docent",                             aantal: "1", oppervlakte: "8"      },
        { name: "EHBO-ruimte",                                 aantal: "1", oppervlakte: "10"     },
        { name: "Gymzaal; multifunctioneel",                   aantal: "1", oppervlakte: "343.42" }
      ]
    }
  ]
};
