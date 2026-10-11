/**
 * cameroonLocations.ts
 *
 * Complete administrative hierarchy of Cameroon:
 *   10 Regions → Divisions → Subdivisions (Arrondissements)
 *
 * Source: official Cameroonian administrative divisions.
 */

export interface Subdivision {
  name: string;
}

export interface Division {
  name: string;
  subdivisions: Subdivision[];
}

export interface Region {
  name: string;
  divisions: Division[];
}

export const CAMEROON_REGIONS: Region[] = [
  {
    name: "Adamawa",
    divisions: [
      {
        name: "Djerem",
        subdivisions: [
          { name: "Tibati" }, { name: "Ngaoundal" }, { name: "Mbakaou" },
        ],
      },
      {
        name: "Faro-et-Déo",
        subdivisions: [
          { name: "Tignère" }, { name: "Galim-Tignère" }, { name: "Kontcha" },
        ],
      },
      {
        name: "Mayo-Banyo",
        subdivisions: [
          { name: "Banyo" }, { name: "Martap" }, { name: "Mayo-Darlé" },
        ],
      },
      {
        name: "Mbéré",
        subdivisions: [
          { name: "Meiganga" }, { name: "Djohong" }, { name: "Ngaoui" }, { name: "Ngan-Ha" },
        ],
      },
      {
        name: "Vina",
        subdivisions: [
          { name: "Ngaoundéré 1er" }, { name: "Ngaoundéré 2ème" }, { name: "Ngaoundéré 3ème" },
          { name: "Belel" }, { name: "Mayo-Ngéléwé" }, { name: "Nyambaka" },
        ],
      },
    ],
  },
  {
    name: "Centre",
    divisions: [
      {
        name: "Haute-Sanaga",
        subdivisions: [
          { name: "Nanga-Eboko" }, { name: "Bibey" }, { name: "Lembe-Yezoum" }, { name: "Nsem" },
        ],
      },
      {
        name: "Lékié",
        subdivisions: [
          { name: "Monatélé" }, { name: "Batchenga" }, { name: "Elig-Mfomo" },
          { name: "Evodoula" }, { name: "Obala" }, { name: "Sa'a" },
        ],
      },
      {
        name: "Mbam-et-Inoubou",
        subdivisions: [
          { name: "Bafia" }, { name: "Bokito" }, { name: "Deuk" },
          { name: "Ombessa" }, { name: "Kon-Yambetta" }, { name: "Kiiki" },
        ],
      },
      {
        name: "Mbam-et-Kim",
        subdivisions: [
          { name: "Ntui" }, { name: "Mbangassina" }, { name: "Ngambé-Tikar" },
          { name: "Ngoro" },
        ],
      },
      {
        name: "Mefou-et-Afamba",
        subdivisions: [
          { name: "Esse" }, { name: "Awaé" }, { name: "Bikok" },
          { name: "Mfou" }, { name: "Nkolafamba" }, { name: "Soa" },
        ],
      },
      {
        name: "Mefou-et-Akono",
        subdivisions: [
          { name: "Ngoumou" }, { name: "Akono" }, { name: "Bikok" }, { name: "Mbankomo" },
        ],
      },
      {
        name: "Méfou-et-Afamba",
        subdivisions: [
          { name: "Mfou" }, { name: "Esse" }, { name: "Awaé" },
        ],
      },
      {
        name: "Mfoundi",
        subdivisions: [
          { name: "Yaoundé 1er" }, { name: "Yaoundé 2ème" }, { name: "Yaoundé 3ème" },
          { name: "Yaoundé 4ème" }, { name: "Yaoundé 5ème" }, { name: "Yaoundé 6ème" },
          { name: "Yaoundé 7ème" },
        ],
      },
      {
        name: "Nyong-et-Kellé",
        subdivisions: [
          { name: "Eséka" }, { name: "Bondjock" }, { name: "Bot-Makak" },
          { name: "Kellé" }, { name: "Makak" }, { name: "Matomb" }, { name: "Messondo" },
        ],
      },
      {
        name: "Nyong-et-Mfoumou",
        subdivisions: [
          { name: "Akonolinga" }, { name: "Ayos" }, { name: "Endom" },
          { name: "Mengueme" }, { name: "Kobdombo" },
        ],
      },
      {
        name: "Nyong-et-So'o",
        subdivisions: [
          { name: "Mbalmayo" }, { name: "Dzeng" }, { name: "Mbandjock" },
          { name: "Ngoumou" },
        ],
      },
    ],
  },
  {
    name: "East",
    divisions: [
      {
        name: "Boumba-et-Ngoko",
        subdivisions: [
          { name: "Yokadouma" }, { name: "Gari-Gombo" }, { name: "Moloundou" },
          { name: "Salapoumbé" },
        ],
      },
      {
        name: "Haut-Nyong",
        subdivisions: [
          { name: "Abong-Mbang" }, { name: "Angossas" }, { name: "Atok" },
          { name: "Diang" }, { name: "Doumaintang" }, { name: "Doumé" },
          { name: "Lomié" }, { name: "Mboma" }, { name: "Messamena" },
          { name: "Messok" }, { name: "Mindourou" }, { name: "Ngoyla" },
          { name: "Nguelemendouka" }, { name: "Somalomo" },
        ],
      },
      {
        name: "Kadei",
        subdivisions: [
          { name: "Batouri" }, { name: "Bétaré-Oya" }, { name: "Kette" },
          { name: "Mbang" }, { name: "Ndelele" }, { name: "Nguelebok" },
          { name: "Ouli" },
        ],
      },
      {
        name: "Lom-et-Djerem",
        subdivisions: [
          { name: "Bertoua 1er" }, { name: "Bertoua 2ème" }, { name: "Bélabo" },
          { name: "Diang" }, { name: "Mandjou" },
        ],
      },
    ],
  },
  {
    name: "Far North",
    divisions: [
      {
        name: "Diamaré",
        subdivisions: [
          { name: "Maroua 1er" }, { name: "Maroua 2ème" }, { name: "Maroua 3ème" },
          { name: "Bogo" }, { name: "Gazawa" }, { name: "Meri" },
          { name: "Mindif" }, { name: "Moulvoudaye" }, { name: "Moutourwa" },
          { name: "Petté" },
        ],
      },
      {
        name: "Logone-et-Chari",
        subdivisions: [
          { name: "Kousseri" }, { name: "Blangoua" }, { name: "Darak" },
          { name: "Fotokol" }, { name: "Goulfey" }, { name: "Logone-Birni" },
          { name: "Makary" }, { name: "Ngodeni" }, { name: "Waza" },
          { name: "Zina" },
        ],
      },
      {
        name: "Mayo-Danay",
        subdivisions: [
          { name: "Yagoua" }, { name: "Datchéka" }, { name: "Guémé" },
          { name: "Kai-Kai" }, { name: "Kalfou" }, { name: "Maga" },
          { name: "Tchatibali" }, { name: "Vélé" }, { name: "Wina" },
        ],
      },
      {
        name: "Mayo-Kani",
        subdivisions: [
          { name: "Kaélé" }, { name: "Guidiguis" }, { name: "Mboula" },
          { name: "Ndoukoula" }, { name: "Touboro" },
        ],
      },
      {
        name: "Mayo-Sava",
        subdivisions: [
          { name: "Mora" }, { name: "Kérawa" }, { name: "Kolofata" },
          { name: "Tokombéré" },
        ],
      },
      {
        name: "Mayo-Tsanaga",
        subdivisions: [
          { name: "Mokolo" }, { name: "Bourrha" }, { name: "Hina" },
          { name: "Koza" }, { name: "Mogodé" }, { name: "Mozogo" },
          { name: "Roua" },
        ],
      },
    ],
  },
  {
    name: "Littoral",
    divisions: [
      {
        name: "Moungo",
        subdivisions: [
          { name: "Nkongsamba 1er" }, { name: "Nkongsamba 2ème" }, { name: "Nkongsamba 3ème" },
          { name: "Bare-Bakem" }, { name: "Loum" }, { name: "Manjo" },
          { name: "Mbanga" }, { name: "Melong" }, { name: "Mombo" },
          { name: "Njombe-Penja" },
        ],
      },
      {
        name: "Nkam",
        subdivisions: [
          { name: "Yabassi" }, { name: "Éséka" }, { name: "Ndom" },
          { name: "Ngambe" }, { name: "Yingui" },
        ],
      },
      {
        name: "Sanaga-Maritime",
        subdivisions: [
          { name: "Edéa 1er" }, { name: "Edéa 2ème" }, { name: "Dizangué" },
          { name: "Mouanko" }, { name: "Ngambe" }, { name: "Nyanon" },
          { name: "Pouma" },
        ],
      },
      {
        name: "Wouri",
        subdivisions: [
          { name: "Douala 1er" }, { name: "Douala 2ème" }, { name: "Douala 3ème" },
          { name: "Douala 4ème" }, { name: "Douala 5ème" }, { name: "Douala 6ème" },
        ],
      },
    ],
  },
  {
    name: "North",
    divisions: [
      {
        name: "Bénoué",
        subdivisions: [
          { name: "Ngaoundéré 1er" }, { name: "Garoua 1er" }, { name: "Garoua 2ème" },
          { name: "Garoua 3ème" }, { name: "Bibemi" }, { name: "Dembo" },
          { name: "Lagdo" }, { name: "Mayo-Hourna" }, { name: "Pitoa" },
          { name: "Tchéboa" },
        ],
      },
      {
        name: "Faro",
        subdivisions: [
          { name: "Poli" }, { name: "Beka" }, { name: "Tchamba" },
        ],
      },
      {
        name: "Mayo-Louti",
        subdivisions: [
          { name: "Guider" }, { name: "Figuil" }, { name: "Mayo-Galke" },
          { name: "Mousgoy" },
        ],
      },
      {
        name: "Mayo-Rey",
        subdivisions: [
          { name: "Rey-Bouba" }, { name: "Madingring" }, { name: "Mayo-Baléo" },
          { name: "Touboro" },
        ],
      },
    ],
  },
  {
    name: "Northwest",
    divisions: [
      {
        name: "Boyo",
        subdivisions: [
          { name: "Fundong" }, { name: "Bum" }, { name: "Furu-Awa" },
        ],
      },
      {
        name: "Bui",
        subdivisions: [
          { name: "Kumbo" }, { name: "Jakiri" }, { name: "Nkum" },
          { name: "Noni" }, { name: "Oku" },
        ],
      },
      {
        name: "Donga-Mantung",
        subdivisions: [
          { name: "Nkambe" }, { name: "Ako" }, { name: "Misaje" },
          { name: "Nwa" }, { name: "Furu-Awa" },
        ],
      },
      {
        name: "Menchum",
        subdivisions: [
          { name: "Wum" }, { name: "Befang" }, { name: "Fungom" },
          { name: "Zhoa" },
        ],
      },
      {
        name: "Mezam",
        subdivisions: [
          { name: "Bamenda 1" }, { name: "Bamenda 2" }, { name: "Bamenda 3" },
          { name: "Bafut" }, { name: "Bali" }, { name: "Santa" },
          { name: "Tubah" },
        ],
      },
      {
        name: "Momo",
        subdivisions: [
          { name: "Mbengwi" }, { name: "Batibo" }, { name: "Njikwa" },
          { name: "Widikum" },
        ],
      },
      {
        name: "Ngokentunjia",
        subdivisions: [
          { name: "Ndop" }, { name: "Balikumbat" }, { name: "Bali" },
          { name: "Galim" },
        ],
      },
    ],
  },
  {
    name: "South",
    divisions: [
      {
        name: "Dja-et-Lobo",
        subdivisions: [
          { name: "Sangmélima" }, { name: "Bengbis" }, { name: "Djoum" },
          { name: "Meyomessala" }, { name: "Meyomessi" }, { name: "Mintom" },
          { name: "Oveng" }, { name: "Zoétélé" },
        ],
      },
      {
        name: "Mvila",
        subdivisions: [
          { name: "Ebolowa 1er" }, { name: "Ebolowa 2ème" }, { name: "Akom II" },
          { name: "Efoulan" }, { name: "Evindissi" }, { name: "Mengong" },
          { name: "Mvangan" }, { name: "Ngoulemakong" },
        ],
      },
      {
        name: "Océan",
        subdivisions: [
          { name: "Kribi 1er" }, { name: "Kribi 2ème" }, { name: "Akom II" },
          { name: "Campo" }, { name: "Lolodorf" }, { name: "Mvengue" },
          { name: "Bipindi" },
        ],
      },
      {
        name: "Vallée-du-Ntem",
        subdivisions: [
          { name: "Ambam" }, { name: "Kyé-Ossi" }, { name: "Ma'an" },
          { name: "Olamze" },
        ],
      },
    ],
  },
  {
    name: "Southwest",
    divisions: [
      {
        name: "Fako",
        subdivisions: [
          { name: "Buea" }, { name: "Limbe 1er" }, { name: "Limbe 2ème" },
          { name: "Limbe 3ème" }, { name: "Muyuka" }, { name: "West Coast" },
          { name: "Tiko" },
        ],
      },
      {
        name: "Koupé-Manengouba",
        subdivisions: [
          { name: "Bangem" }, { name: "Nguti" }, { name: "Tombel" },
          { name: "Konye" },
        ],
      },
      {
        name: "Lebialem",
        subdivisions: [
          { name: "Menji" }, { name: "Alou" }, { name: "Fontem" },
          { name: "Wabane" },
        ],
      },
      {
        name: "Manyu",
        subdivisions: [
          { name: "Mamfe" }, { name: "Akwaya" }, { name: "Bachuo-Akagbe" },
          { name: "Eyumojock" }, { name: "Tinto" },
        ],
      },
      {
        name: "Meme",
        subdivisions: [
          { name: "Kumba 1er" }, { name: "Kumba 2ème" }, { name: "Kumba 3ème" },
          { name: "Konye" }, { name: "Mbonge" },
        ],
      },
      {
        name: "Ndian",
        subdivisions: [
          { name: "Mundemba" }, { name: "Dikome Balue" }, { name: "Ekondo-Titi" },
          { name: "Idabato" }, { name: "Isangele" }, { name: "Kombo-Abedimo" },
          { name: "Kombo-Itindi" }, { name: "Mbonge" }, { name: "Nguti" },
        ],
      },
    ],
  },
  {
    name: "West",
    divisions: [
      {
        name: "Bamboutos",
        subdivisions: [
          { name: "Mbouda" }, { name: "Babadjou" }, { name: "Batcham" },
          { name: "Galim" }, { name: "Pitoa" },
        ],
      },
      {
        name: "Haut-Nkam",
        subdivisions: [
          { name: "Bafang" }, { name: "Bana" }, { name: "Bakou" },
          { name: "Bandja" }, { name: "Banka" }, { name: "Kekem" },
        ],
      },
      {
        name: "Hauts-Plateaux",
        subdivisions: [
          { name: "Baham" }, { name: "Bamendjou" }, { name: "Bangou" },
          { name: "Bangangté" },
        ],
      },
      {
        name: "Koung-Khi",
        subdivisions: [
          { name: "Bafoussam 1er" }, { name: "Bafoussam 2ème" }, { name: "Bafoussam 3ème" },
          { name: "Bayangam" },
        ],
      },
      {
        name: "Menoua",
        subdivisions: [
          { name: "Dschang" }, { name: "Fokoué" }, { name: "Foto" },
          { name: "Nkong-Zem" }, { name: "Penka-Michel" }, { name: "Santchou" },
        ],
      },
      {
        name: "Mifi",
        subdivisions: [
          { name: "Bafoussam 1er" }, { name: "Bafoussam 2ème" }, { name: "Bafoussam 3ème" },
          { name: "Bafoussam 4ème" }, { name: "Bafoussam 5ème" },
        ],
      },
      {
        name: "Nde",
        subdivisions: [
          { name: "Bangangté" }, { name: "Bassamba" }, { name: "Bazou" },
          { name: "Ndikinimeki" }, { name: "Tonga" },
        ],
      },
      {
        name: "Noun",
        subdivisions: [
          { name: "Foumban" }, { name: "Foumbot" }, { name: "Koutaba" },
          { name: "Kouoptamo" }, { name: "Magba" }, { name: "Malentouen" },
          { name: "Massangam" }, { name: "Njimom" },
        ],
      },
    ],
  },
];

/** Returns the divisions for a given region name, or [] if not found. */
export function getDivisions(regionName: string): Division[] {
  return (
    CAMEROON_REGIONS.find((r) => r.name === regionName)?.divisions ?? []
  );
}

/** Returns the subdivisions for a given region + division, or [] if not found. */
export function getSubdivisions(regionName: string, divisionName: string): Subdivision[] {
  return (
    getDivisions(regionName).find((d) => d.name === divisionName)?.subdivisions ?? []
  );
}
