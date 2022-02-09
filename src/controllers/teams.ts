import { Request, Response } from "express";
import { prisma, saltRounds } from "../server";
import bcrypt from "bcrypt";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

const selectedFields = {
  id: true,
  name: true,
  members: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  },
  race: true,
  admins: {
    select: {
      id: true,
      admin: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
              email: true,
            },
          },
        },
      },
    },
  },
  edition: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const getTeams = async (req: Request, res: Response) => {
  console.log(getTeams);
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

export const getTeamById = async (req: Request, res: Response) => {
  console.log(getTeamById);
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
  console.log(createTeam);
  const { name, password, raceId, editionId } = req.body;
  bcrypt.hash(password, saltRounds, async (err, hash) => {
    try {
      console.log("Felool", req.user.id);
      const athlete = await prisma.athlete.findUnique({
        where: {
          userId: req.user.id,
        },
      });
      if (athlete !== null) {
        if (athlete.teamId === null) {
          const team = await prisma.team.create({
            data: {
              name: name,
              password: hash,
              members: {
                connect: {
                  id: athlete.id,
                },
              },
              raceId: raceId,
              editionId: editionId,
            },
            select: selectedFields,
          });
          await prisma.teamAdmin.create({
            data: {
              teamId: team.id,
              adminId: athlete.id,
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
            err: "Athlete is already a team member.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "User is not an athlete.",
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
  console.log(deleteTeam);
  const teamId = parseInt(req.params.id);
  try {
    const teamAdmin = await prisma.teamAdmin.findUnique({
      where: {
        adminId: req.user.id,
      },
    });
    if (
      (teamAdmin !== null && teamAdmin.teamId === teamId) ||
      req.user.role.includes("ADMIN")
    ) {
      await prisma.team.delete({
        where: {
          id: teamId,
        },
      });
      res.json({
        success: "Team deleted successfully.",
      });
    } else {
      res.status(400);
      res.json({
        err: "Not enought rights to delete this team",
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

export const joinTeam = async (req: Request, res: Response) => {
  console.log(joinTeam);
  const teamId = parseInt(req.params.id);
  const { password } = req.body;
  try {
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
      },
    });
    const teamMembers = await prisma.athlete.findMany({
      where: {
        teamId: teamId,
      },
    });
    if (
      team !== null &&
      teamMembers.length < team?.race.category.maxTeamMembers
    ) {
      bcrypt.compare(password, String(team?.password), async (err, result) => {
        if (result === true) {
          console.log(req.user.id);
          const athlete = await prisma.athlete.findUnique({
            where: {
              userId: req.user.id,
            },
          });
          const inscription = await prisma.inscription.findFirst({
            where: {
              athleteId: athlete?.id,
              editionId: team.editionId,
            },
          });
          if (athlete !== null) {
            if (athlete.teamId === null) {
              if (inscription === null || inscription.raceId === team.raceId) {
                const team = await prisma.team.update({
                  where: {
                    id: teamId,
                  },
                  data: {
                    members: {
                      connect: {
                        id: athlete.id,
                      },
                    },
                  },
                  select: selectedFields,
                });
                if (inscription === null) {
                  await prisma.inscription.create({
                    data: {
                      athleteId: athlete.id,
                      editionId: team.edition.id,
                      raceId: team.race.id,
                    },
                  });
                }
                res.json(team);
              } else {
                res.status(400);
                res.json({
                  err: "The team you try to join is not in the race catégory you pay for.",
                });
              }
            } else {
              res.status(400);
              res.json({
                err: "Athlete is already a member of a team.",
              });
            }
          } else {
            res.status(400);
            res.json({
              err: "User is not an athlete",
            });
          }
        } else {
          res.status(403);
          res.json({
            err: "Wrong password",
          });
        }
      });
    } else {
      res.status(400);
      res.json({
        err: "Max team members reached.",
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
  console.log(leaveTeam);
  const teamId = parseInt(req.params.id);
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        userId: req.user.id,
      },
      include: {
        teamAdmin: {
          select: {
            id: true,
            teamId: true,
          },
        },
      },
    });

    if (athlete !== null) {
      if (athlete.teamId === teamId) {
        if (athlete.teamAdmin !== null) {
          await prisma.teamAdmin.delete({
            where: {
              adminId: athlete.id,
            },
          });

          const team = await prisma.team.update({
            where: {
              id: teamId,
            },
            data: {
              members: {
                disconnect: {
                  id: athlete.id,
                },
              },
            },
            select: selectedFields,
          });
          const teamAdmins = await prisma.teamAdmin.findMany({
            where: {
              id: team.id,
            },
          });
          if (teamAdmins.length === 0) {
            const teamMembers = await prisma.athlete.findMany({
              where: {
                teamId: team.id,
              },
            });
            if (teamMembers.length === 0) {
              await prisma.team.delete({
                where: {
                  id: team.id,
                },
              });
              res.json({
                info: "Team deleted: no more team member.",
              });
            } else {
              await prisma.teamAdmin.create({
                data: {
                  teamId: team.id,
                  adminId: teamMembers[0].id,
                },
              });
              res.json(
                await prisma.team.findUnique({
                  where: {
                    id: teamId,
                  },
                  select: selectedFields,
                })
              );
            }
          } else {
            res.json(team);
          }
        } else {
          res.json(await prisma.team.update({
            where: {
              id: teamId,
            },
            data: {
              members: {
                disconnect: {
                  id: athlete.id,
                },
              },
            },
            select: selectedFields,
          }));
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
        err: "User is not an Athlete",
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
    const admin = await prisma.athlete.findUnique({
      where: {
        userId: req.user.id,
      },
      include: {
        teamAdmin: {
          select: {
            teamId: true,
          },
        },
      },
    });
    console.log(admin);
    const athlete = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
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
      admin?.teamAdmin?.teamId !== null &&
      admin?.teamAdmin?.teamId === teamId
    ) {
      if (athlete !== null && athlete.teamId === teamId) {
        if (athlete.teamAdmin === null) {
          await prisma.teamAdmin.create({
            data: {
              adminId: athlete.id,
              teamId: teamId,
            },
          });
          const team = await prisma.team.findUnique({
            where: {
              id: teamId,
            },
            select: selectedFields,
          });
          res.json(team);
        } else {
          res.status(400);
          res.json({
            err: "Athlete selected is already a team admin.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "Athelete selected is not a team member.",
        });
      }
    } else {
      res.status(403);
      res.json({
        err: "User is not an admin of the team.",
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
  console.log(removeTeamAdmin);
  const teamId = parseInt(req.params.id);
  const { athleteId } = req.body;
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
      },
      include: {
        teamAdmin: {
          select: {
            teamId: true,
          },
        },
      },
    });
    const admin = await prisma.athlete.findUnique({
      where: {
        userId: req.user.id,
      },
      include: {
        teamAdmin: {
          select: {
            adminId: true,
            teamId: true,
          },
        },
      },
    });
    if (admin !== null) {
      if (admin.teamId === teamId) {
        if (admin.teamAdmin !== null && admin.teamAdmin.teamId === teamId) {
          if (athlete !== null) {
            if (athlete.teamId === teamId) {
              if (athlete.id !== admin.id) {
                if (
                  athlete.teamAdmin !== null &&
                  athlete.teamAdmin.teamId === teamId
                ) {
                  await prisma.teamAdmin.delete({
                    where: {
                      adminId: athlete.id,
                    },
                  });
                }
                const team = await prisma.team.findUnique({
                  where: {
                    id: teamId,
                  },
                  select: selectedFields,
                });
                res.json(team);
              } else {
                res.status(400);
                res.json({
                  err: "You cannot remove yourself from the team: use leave function instead.",
                });
              }
            } else {
              res.status(400);
              res.json({
                err: "Athlete is not a member of yout team.",
              });
            }
          } else {
            res.status(400);
            res.json({
              err: "The user is not an athlete.",
            });
          }
        } else {
          res.status(400);
          res.json({
            err: "You are not a team admin.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "You are not a member of the team.",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "You are not an athlete.",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

export const removeTeamMember = async (req: Request, res: Response) => {
  console.log(removeTeamMember);
  const teamId = parseInt(req.params.id);
  // todo ETUDIER QUAND C'EST NULL
  const { athleteId } = req.body;
  try {
    const athlete = await prisma.athlete.findUnique({
      where: {
        id: athleteId,
      },
      include: {
        teamAdmin: {
          select: {
            teamId: true,
          },
        },
      },
    });
    const admin = await prisma.athlete.findUnique({
      where: {
        userId: req.user.id,
      },
      include: {
        teamAdmin: {
          select: {
            adminId: true,
            teamId: true,
          },
        },
      },
    });
    if (admin !== null) {
      if (admin.teamId === teamId) {
        if (admin.teamAdmin !== null && admin.teamAdmin.teamId === teamId) {
          if (athlete !== null) {
            if (athlete.teamId === teamId) {
              if (athlete.id !== admin.id) {
                if (
                  athlete.teamAdmin !== null &&
                  athlete.teamAdmin.teamId === teamId
                ) {
                  await prisma.teamAdmin.delete({
                    where: {
                      adminId: athlete.id,
                    },
                  });
                }
                await prisma.athlete.update({
                  where: {
                    id: athlete.id,
                  },
                  data: {
                    teamId: null,
                  },
                });
                const team = await prisma.team.findUnique({
                  where: {
                    id: teamId,
                  },
                  select: selectedFields,
                });
                res.json(team);
              } else {
                res.status(400);
                res.json({
                  err: "You cannot remove yourself from the team: use leave function instead.",
                });
              }
            } else {
              res.status(400);
              res.json({
                err: "Athlete is not a member of yout team.",
              });
            }
          } else {
            res.status(400);
            res.json({
              err: "The user is not an athlete.",
            });
          }
        } else {
          res.status(400);
          res.json({
            err: "You are not a team admin.",
          });
        }
      } else {
        res.status(400);
        res.json({
          err: "You are not a member of the team.",
        });
      }
    } else {
      res.status(400);
      res.json({
        err: "You are not an athlete.",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

export const updateTeamPassword = async (req: Request, res: Response) => {
  console.log(updateTeamPassword);
  const { password } = req.body;
  const teamId = parseInt(req.params.id);
  try {
    const admin = await prisma.athlete.findUnique({
      where: {
        userId: req.user.id,
      },
      include: {
        teamAdmin: {
          select: {
            teamId: true,
          },
        },
      },
    });
    if (admin !== null) {
      if (admin.teamId !== null && admin.teamId === teamId) {
        if (admin.teamAdmin !== null && admin.teamAdmin?.teamId === teamId) {
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
            err: "Athlete doesn't have enought rignts.",
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
        err: "User is not an athlete.",
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
