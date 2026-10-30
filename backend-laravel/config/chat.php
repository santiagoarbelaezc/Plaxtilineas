<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Canonical catalog search terms
    |--------------------------------------------------------------------------
    |
    | The assistant classifies natural-language requests into one canonical
    | term. That same term is sent to the catalog search page.
    */
    'catalog_terms' => [
        'espuma' => [
            'espuma', 'espumas', 'espumado', 'tapiceria', 'tapicería',
            'relleno', 'acolchado', 'colchoneta', 'colchones',
        ],
        'lamina_espuma' => [
            'lamina espuma', 'lámina espuma', 'espuma para mueble',
            'espuma para sofa', 'espuma para sofá', 'espuma para sillon',
        ],
        'plastico' => [
            'plastico', 'plástico', 'plasticos', 'plásticos', 'vinilo',
            'polietileno', 'polipropileno', 'plastificar',
        ],
        'empaque' => [
            'empaque', 'empaques', 'embalaje', 'embalajes',
            'empacar', 'envolver', 'proteger mercancía', 'proteger mercancia',
        ],
        'malla' => [
            'malla',
            'mallas',
            'gallinero',
            'gallinas',
            'gallina',
            'aves',
            'corral',
            'encerrar',
            'encerrarlas',
            'metalica',
            'metálica',
        ],
        'polisombra' => [
            'polisombra', 'sombra', 'cubrir cultivo', 'cubrir cultivo',
            'invernadero', 'proteger del sol', 'proteger del sol',
        ],
        'colchon' => ['colchon', 'colchón', 'colchones', 'descanso', 'cama'],
        'tela' => [
            'tela', 'telas', 'tapiz', 'tapiceria', 'tapicería',
            'cerramiento', 'fique', 'mantel',
        ],
        'lona' => [
            'lona', 'lonas', 'impermeable', 'carpa',
            'cubierta', 'techo provisional',
        ],
        'cinta' => [
            'cinta', 'cintas', 'adhesiva', 'adhesivas',
            'enmascarar', 'embalar con cinta',
        ],
        'soga' => [
            'soga', 'sogas', 'cuerda', 'cuerdas', 'amarrar',
            'ganadera', 'marinera', 'pisadora',
        ],
        'cabuya' => ['cabuya', 'cabuya ecologica', 'cabuya ecológica', 'yute'],
        'amarra' => ['amarra', 'amarras', 'brida', 'bridas', 'sujetar cables'],
        'alambre' => ['alambre', 'alambres', 'alambrar', 'cerca de alambre'],
        'piso' => [
            'piso', 'pisos', 'tapete para carro', 'tapete para carro',
            'alfajor', 'estoperol', 'piso pvc',
        ],
        'tapete' => ['tapete', 'tapetes', 'alfombra', 'piso para carro'],
        'vinilo' => ['vinilo', 'vinilos', 'vinilo transparente'],
        'geotextil' => [
            'geotextil', 'drenaje de suelo', 'filtrar suelo',
            'separar tierra', 'controlar erosion', 'controlar erosión',
        ],
        'neopreno' => ['neopreno', 'traje', 'proteccion termica', 'protección térmica'],
        'grama' => ['grama', 'grama sintetica', 'grama sintética', 'pasto sintetico', 'pasto sintético'],
        'carton' => ['carton', 'cartón', 'corrugado', 'caja', 'cajas'],
        'clavo' => ['clavo', 'clavos', 'puntilla', 'puntillas', 'fijar madera'],
        'ductolon' => ['ductolon', 'ductolón', 'aislamiento de tuberia', 'aislamiento de tubería'],
        'strech' => ['strech', 'stretch', 'film', 'envolver pallet', 'envolver palet'],
        'thermolon' => ['thermolon', 'thermolón', 'aislamiento termico', 'aislamiento térmico'],
        'yumbolon' => ['yumbolon', 'yumbolón', 'espuma polietileno', 'proteccion de piso', 'protección de piso'],
        'pegante' => [
            'pegante',
            'pegantes',
            'pegamento',
            'pegamentos',
            'pegar',
            'adhesivo',
            'adhesiva',
            'cola',
            'silicona',
            'zapato',
            'zapatos',
            'cuero',
            'caucho',
        ],
    ],

    'labels' => [
        'lamina_espuma' => 'lámina de espuma',
        'plastico' => 'plástico',
        'colchon' => 'colchón',
        'cabuya' => 'cabuya',
        'amarra' => 'amarras plásticas',
        'alambre' => 'alambre',
        'piso' => 'piso',
        'geotextil' => 'geotextil',
        'ductolon' => 'ductolón',
        'strech' => 'stretch',
        'thermolon' => 'thermolón',
        'yumbolon' => 'yumbolón',
    ],

    'search_keys' => [
        'lamina_espuma' => 'espuma',
        'plastico' => 'plastico',
        'colchon' => 'colchon',
        'amarra' => 'amarra',
        'geotextil' => 'geotextil',
        'ductolon' => 'ductolon',
        'strech' => 'strech',
        'thermolon' => 'thermolon',
        'yumbolon' => 'yumbolon',
    ],
];
