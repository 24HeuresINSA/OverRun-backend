import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { prisma, saltRounds } from "../server";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
import { InscriptionStatus } from "./inscriptions";

const selectedFields = {
  id: true,
  name: true,
  members: {
    select: {
      id: true,
      athlete: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          firstName: true,
          lastName: true,
        },
      },
      status: true,
    },
  },
  race: {
    select: {
      id: true,
      name: true,
      category: {
        select: {
          id: true,
          maxTeamMembers: true,
          minTeamMembers: true,
        },
      },
    },
  },
  admins: {
    select: {
      id: true,
      adminInscription: {
        select: {
          id: true,
          athleteId: true,
        },
      },
    },
  },
};

export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit,
      where: Object.assign({}, req.search, req.filter),
      select: selectedFields,
    });
    res.json(jsonPaginateResponse(teams, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getTeamsLight = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      skip: req.paginate.skipIndex,
      take: req.paginate.limit,
      where: Object.assign({}, req.search, req.filter),
      select: {
        id: true,
        name: true,
      },
    });
    res.json(jsonPaginateResponse(teams, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getTeamById = async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: selectedFields,
    });
    res.json(team);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createTeam = async (req: Request, res: Response) => {
  const { name, password, raceId, editionId } = req.body;
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    try {
      const edition = await prisma.edition.findUnique({
        where: {
          id: editionId,
        },
      });
      if (edition !== null && edition.active === true) {
        const race = await prisma.race.findUnique({
          where: {
            id: raceId,
          },
          include: {
            category: true,
          },
        });
        if (race !== null && race.editionId === edition.id) {
          const athlete = await prisma.athlete.findUnique({
            where: {
              userId: req.user.id,
            },
          });
          if (athlete !== null) {
            let inscription = await prisma.inscription.findFirst({
              where: {
                athlete: {
                  is: {
                    userId: req.user.id,
                  },
                },
                editionId: edition.id,
                OR: [
                  { status: InscriptionStatus.PENDING },
                  { status: InscriptionStatus.VALIDATED },
                ],
              },
            });
            const teams = await prisma.team.findMany({
              where: {
                raceId: race.id,
              },
            });
            if (teams.length < race.maxTeams) {
              let createNewTeam = false;

              if (inscription !== null) {
                if (inscription.teamId === null) {
                  if (inscription.raceId === race.id) {
                    createNewTeam = true;
                  } else {
                    res.status(400);
                    return res.json({
                      err: "Athlete is registered in another race.",
                    });
                  }
                } else {
                  res.status(400);
                  return res.json({
                    err: "AThlete is already a team member.",
                  });
                }
              } else {
                inscription = await prisma.inscription.create({
                  data: {
                    athleteId: athlete.id,
                    editionId: edition.id,
                    raceId: race.id,
                  },
                });
                createNewTeam = true;
              }
              if (createNewTeam === true && inscription !== null) {
                const inscriptionId = inscription.id;
                const team = await prisma.team.create({
                  data: {
                    name: name,
                    password: hash,
                    raceId: race.id,
                    editionId: edition.id,
                  },
                });
                await prisma.inscription.update({
                  where: {
                    id: inscription?.id,
                  },
                  data: {
                    teamId: team.id,
                  },
                });
                await prisma.teamAdmin.create({
                  data: {
                    teamId: team.id,
                    adminInscriptionId: inscriptionId,
                  },
                });
                res.json(
                  await prisma.team.findUnique({
                    where: {
                      id: team.id,
                    },
                    select: selectedFields,
                  })
                );
              } else {
                res.status(500);
                res.json({
                  err: "Internal error.",
                });
              }
            } else {
              res.status(400);
              res.json({
                err: "Race full.",
              });
            }
          } else {
            res.status(400);
            res.json({
              err: "Athlete doesn't exist.",
            });
          }
        } else {
          res.status(400);
          res.json({
            err: "Race is not registered for this edition.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Edition is not active.",
        });
      }
    } catch (e) {
      console.log(e);
      res.status(500);
      res.json({
        err: "Internal error.",
      });
    }
  });
};

export const deleteTeam = async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  try {
    await prisma.team.delete({
      where: {
        id: teamId,
      },
    });
    res.json({
      success: "Team deleted successfully.",
    });
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const joinTeam = async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  const { password } = req.body;
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        userId: req.user.id,
      },
    });
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        race: {
          include: {
            category: true,
          },
        },
        edition: true,
      },
    });
    const teamMembers = await prisma.inscription.findMany({
      where: {
        teamId: team?.id,
        OR: [
          { status: InscriptionStatus.PENDING },
          { status: InscriptionStatus.VALIDATED },
        ],
      },
    });
    if (athlete !== null && team !== null) {
      if (
        team !== null &&
        team.race.category.maxTeamMembers > teamMembers.length
      ) {
        if (team.edition.active === true) {
          let inscription = await prisma.inscription.findFirst({
            where: {
              athleteId: athlete.id,
              editionId: team.editionId,
              OR: [
                { status: InscriptionStatus.PENDING },
                { status: InscriptionStatus.VALIDATED },
              ],
            },
          });
          bcrypt.compare(
            password,
            String(team.password),
            async (err, result) => {
              if (result === true) {
                let created = false;
                if (inscription === null) {
                  inscription = await prisma.inscription.create({
                    data: {
                      athleteId: athlete.id,
                      editionId: team.editionId,
                      teamId: team.id,
                      raceId: team.raceId,
                    },
                  });
                  created = true;
                } else {
                  if (inscription.teamId === null) {
                    if (inscription.raceId === team.raceId) {
                      inscription = await prisma.inscription.update({
                        where: {
                          id: inscription.id,
                        },
                        data: {
                          teamId: team.id,
                        },
                      });
                      created = true;
                    } else {
                      res.status(400);
                      res.json({
                        err: "Wrong race. Team race doesn't match athlete race inscription.",
                      });
                    }
                  } else {
                    res.status(400);
                    res.json({
                      err: "Athlete is already in a team",
                    });
                  }
                }
                if (created) {
                  res.status(201);
                  res.json(
                    await prisma.team.findUnique({
                      where: {
                        id: team.id,
                      },
                    })
                  );
                }
              } else {
                res.status(400);
                res.json({
                  err: "Wrong password!",
                });
              }
            }
          );
        } else {
          res.status(400);
          res.json({
            err: "Edition is not active.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Team is full.",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "Athlete or team doesn't exist.",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const leaveTeam = async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        userId: req.user.id,
      },
    });
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    if (athlete !== null && team !== null) {
      const inscription = await prisma.inscription.findFirst({
        where: {
          athleteId: athlete.id,
          teamId: teamId,
          OR: [
            { status: InscriptionStatus.PENDING },
            { status: InscriptionStatus.VALIDATED },
          ],
        },
        include: {
          teamAdmin: true,
        },
      });
      if (inscription !== null) {
        await prisma.inscription.update({
          where: {
            id: inscription.id,
          },
          data: {
            teamId: null,
          },
        });
        if (inscription.teamAdmin !== null) {
          await prisma.teamAdmin.deleteMany({
            where: {
              adminInscriptionId: inscription.id,
              teamId: team.id,
            },
          });
          const teamAdmins = prisma.teamAdmin.findMany({
            where: {
              teamId: team?.id,
            },
          });
          if (teamAdmins !== null && (await teamAdmins).length === 0) {
            const teamMember = await prisma.inscription.findFirst({
              where: {
                teamId: team.id,
              },
            });
            if (teamMember !== null) {
              await prisma.teamAdmin.create({
                data: {
                  teamId: team.id,
                  adminInscriptionId: inscription.id,
                },
              });
            } else {
              await prisma.team.delete({
                where: {
                  id: team.id,
                },
              });
            }
          }
          res.json(
            await prisma.team.findUnique({
              where: {
                id: team.id,
              },
              select: selectedFields,
            })
          );
        }
      } else {
        res.status(400);
        res.json({
          err: "Athlete is not a team member",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "Athlte or team doesn't exists.",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const addTeamAdmin = async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  const { athleteId } = req.body;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        edition: true,
      },
    });

    if (team !== null && team.edition.active === true) {
      const admin = await prisma.inscription.findFirst({
        where: {
          athlete: {
            is: {
              userId: req.user.id,
            },
          },
          teamId: team?.id,
          OR: [
            { status: InscriptionStatus.PENDING },
            { status: InscriptionStatus.VALIDATED },
          ],
        },
        include: {
          teamAdmin: {
            select: {
              teamId: true,
            },
          },
        },
      });
      if (
        admin !== null &&
        admin.teamAdmin !== null &&
        admin.teamAdmin.teamId === team.id
      ) {
        const inscription = await prisma.inscription.findFirst({
          where: {
            athleteId: athleteId,
            teamId: teamId,
            OR: [
              { status: InscriptionStatus.PENDING },
              { status: InscriptionStatus.VALIDATED },
            ],
          },
          include: {
            teamAdmin: true,
          },
        });
        if (inscription !== null) {
          if (inscription.teamAdmin === null) {
            await prisma.teamAdmin.create({
              data: {
                teamId: team.id,
                adminInscriptionId: inscription.id,
              },
            });
            res.json(
              await prisma.team.findUnique({
                where: {
                  id: team.id,
                },
              })
            );
          } else {
            res.status(400);
            res.json({
              err: "Member is already a team admin.",
            });
          }
        } else {
          res.status(400);
          res.json({
            err: "Athlete is not a team member.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Athlete must be a team admin.",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "Team doesn't exist or editon is not active",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const removeTeamAdmin = async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  const { athleteId } = req.body;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    if (team !== null) {
      const admin = await prisma.teamAdmin.findFirst({
        where: {
          teamId: team?.id,
          adminInscription: {
            is: {
              athlete: {
                is: {
                  userId: req.user.id,
                },
              },
            },
          },
        },
        include: {
          adminInscription: {
            include: {
              athlete: true,
            },
          },
        },
      });
      if (admin !== null) {
        const athlete = await prisma.teamAdmin.findFirst({
          where: {
            teamId: team?.id,
            adminInscription: {
              is: {
                athlete: {
                  is: {
                    id: athleteId,
                  },
                },
              },
            },
          },
          include: {
            adminInscription: {
              include: {
                athlete: true,
              },
            },
          },
        });
        if (athlete !== null) {
          if (
            admin.adminInscription.athlete.id !==
            athlete.adminInscription.athleteId
          ) {
            await prisma.teamAdmin.delete({
              where: {
                id: athlete.id,
              },
            });
            res.json(
              await prisma.team.findUnique({
                where: {
                  id: team.id,
                },
                select: selectedFields,
              })
            );
          } else {
            res.status(400);
            res.json({
              err: "Admin cannot remove him/herself.",
            });
          }
        } else {
          res.status(400);
          res.json({
            err: "Athlete is not an Admin.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Team doesn't exist.",
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const removeTeamMember = async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.id);
  // todo ETUDIER QUAND C'EST NULL
  const { athleteId } = req.body;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    if (team !== null) {
      const admin = await prisma.teamAdmin.findFirst({
        where: {
          teamId: teamId,
          adminInscription: {
            is: {
              athlete: {
                userId: req.user.id,
              },
            },
          },
        },
        include: {
          adminInscription: {
            include: {
              athlete: true,
            },
          },
        },
      });
      if (admin !== null) {
        const member = await prisma.inscription.findFirst({
          where: {
            athleteId: athleteId,
            teamId: team.id,
            OR: [
              { status: InscriptionStatus.PENDING },
              { status: InscriptionStatus.VALIDATED },
            ],
          },
        });
        if (member !== null) {
          await prisma.inscription.update({
            where: {
              id: member.id,
            },
            data: {
              teamId: null,
            },
          });
          res.json(
            await prisma.team.findUnique({
              where: {
                id: team.id,
              },
              select: selectedFields,
            })
          );
        } else {
          res.status(400);
          res.json({
            err: "Athlete is not a team member.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Athlete is not a team admin.",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "Team doesn't exist.",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const updateTeamPassword = async (req: Request, res: Response) => {
  const { password } = req.body;
  const teamId = parseInt(req.params.id);
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    if (team !== null) {
      const admin = await prisma.teamAdmin.findFirst({
        where: {
          teamId: teamId,
          adminInscription: {
            is: {
              athlete: {
                is: {
                  userId: req.user.id,
                },
              },
            },
          },
        },
      });
      if (admin !== null) {
        if (admin.teamId !== null && admin.teamId === teamId) {
          bcrypt.hash(password, saltRounds, async (err, hash) => {
            await prisma.team.update({
              data: {
                password: hash,
              },
              where: {
                id: teamId,
              },
            });
          });
          res.json({
            succes: "Team password successfully updated.",
          });
        } else {
          res.status(400);
          res.json({
            err: "Athlete is not a team member.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "User is not an athlete.",
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};
