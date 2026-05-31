export interface NidAddress {
  addressLine: string;
}

export interface NidDataInfo {
  nationalId: string;
  oldId: string;
  pin: string;
  districtCode?: string;
  birthDayBangla?: string;
  ageBangla?: string;
  data_source?: string;
  nameBangla: string;
  nameEnglish: string;
  dateOfBirth: string;
  gender: string;
  religion: string;
  occupation: string;
  bloodGroup?: string;
  nationality?: string;
  education?: string;
  voterNumber?: string;
  formNumber?: string;
  fatherName: string;
  motherName: string;
  spouseName?: string;
  spouseEn?: string;
  birthPlace: string;
  voterArea: string;
  presentHomeOrHoldingNo?: string;
  presentAdditionalVillageOrRoad?: string;
  presentPostOffice?: string;
  presentPostalCode?: string;
  presentUpozila?: string;
  presentDistrict?: string;
  presentDivision?: string;
  permanentHomeOrHoldingNo?: string;
  permanentAdditionalVillageOrRoad?: string;
  permanentPostOffice?: string;
  permanentPostalCode?: string;
  permanentUpozila?: string;
  permanentDistrict?: string;
  permanentDivision?: string;
  photo?: string;
  preAddress: NidAddress;
  perAddress: NidAddress;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  balance_remaining: number;
  "data-Info": NidDataInfo;
  "id-summary": {
    "10_digit_nid": string;
    "13_digit_oldid": string;
    "17_digit_pin": string;
    note?: string;
  };
  "extra-info"?: {
    district_code?: string;
    birthday_day?: string;
    age_in_bangla?: string;
    data_source?: string;
    main_api_status?: string;
    pin_api_status?: string;
    from_cache?: boolean;
  };
  responseTime?: string;
}
