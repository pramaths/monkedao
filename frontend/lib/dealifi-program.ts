/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/dealifi_candy.json`.
 */
export type DealifiCandy = {
  "address": "3HjM15FLHaRkPmTGhovcdNKu4mv9q6vpvDBeHM4SpvZA",
  "metadata": {
    "name": "dealifiCandy",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createDeal",
      "discriminator": [
        198,
        212,
        144,
        151,
        97,
        56,
        149,
        113
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "merchant"
          ]
        },
        {
          "name": "merchant",
          "writable": true
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              },
              {
                "kind": "arg",
                "path": "params.candy_machine"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createDealParams"
            }
          }
        }
      ]
    },
    {
      "name": "createMerchant",
      "discriminator": [
        249,
        172,
        245,
        100,
        32,
        117,
        97,
        156
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "merchant",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "treasury",
          "type": "pubkey"
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [],
      "args": []
    },
    {
      "name": "recordSale",
      "discriminator": [
        224,
        117,
        233,
        68,
        233,
        154,
        0,
        29
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "deal"
        },
        {
          "name": "sale",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "priceLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakeNft",
      "discriminator": [
        38,
        27,
        66,
        46,
        69,
        65,
        151,
        219
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userClaim",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "candyMachine"
              }
            ]
          }
        },
        {
          "name": "candyMachine"
        },
        {
          "name": "mint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "unstakeNft",
      "discriminator": [
        17,
        182,
        24,
        211,
        101,
        138,
        50,
        163
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userClaim",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "candyMachine"
              }
            ]
          }
        },
        {
          "name": "candyMachine"
        }
      ],
      "args": []
    },
    {
      "name": "updateDealStatus",
      "discriminator": [
        5,
        177,
        233,
        81,
        77,
        174,
        203,
        47
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "merchant"
          ]
        },
        {
          "name": "merchant"
        },
        {
          "name": "deal",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "status",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "deal",
      "discriminator": [
        125,
        223,
        160,
        234,
        71,
        162,
        182,
        219
      ]
    },
    {
      "name": "merchant",
      "discriminator": [
        71,
        235,
        30,
        40,
        231,
        21,
        32,
        64
      ]
    },
    {
      "name": "sale",
      "discriminator": [
        202,
        64,
        232,
        171,
        178,
        172,
        34,
        183
      ]
    },
    {
      "name": "userClaim",
      "discriminator": [
        228,
        142,
        195,
        181,
        228,
        147,
        32,
        209
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "nameTooLong",
      "msg": "Name prefix too long"
    },
    {
      "code": 6001,
      "name": "uriTooLong",
      "msg": "URI prefix too long"
    }
  ],
  "types": [
    {
      "name": "createDealParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "candyMachine",
            "type": "pubkey"
          },
          {
            "name": "collectionMint",
            "type": "pubkey"
          },
          {
            "name": "namePrefix",
            "type": "string"
          },
          {
            "name": "uriPrefix",
            "type": "string"
          },
          {
            "name": "itemsAvailable",
            "type": "u64"
          },
          {
            "name": "goLiveDate",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "endDate",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "payoutWallet",
            "type": "pubkey"
          },
          {
            "name": "allowlistMerkleRoot",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "deal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "candyMachine",
            "type": "pubkey"
          },
          {
            "name": "collectionMint",
            "type": "pubkey"
          },
          {
            "name": "namePrefix",
            "type": "string"
          },
          {
            "name": "uriPrefix",
            "type": "string"
          },
          {
            "name": "itemsAvailable",
            "type": "u64"
          },
          {
            "name": "goLiveDate",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "endDate",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "payoutWallet",
            "type": "pubkey"
          },
          {
            "name": "allowlistMerkleRoot",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "merchant",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sale",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userClaim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "candyMachine",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "isStaked",
            "type": "bool"
          },
          {
            "name": "stakedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "unstakedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
