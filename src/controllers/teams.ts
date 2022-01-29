import { Request, Response } from "express";
import { prisma, saltRounds } from "../server";
import bcrypt from "bcrypt";
import { Athlete, TeamAdmin } from "@prisma/client";

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
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  },
};

export const getTeams = async (
    req: Request, 
    res: Response
) => {
    try {
        const teams = await prisma.team.findMany({
            select: selectedFields,
        });
        res.json(teams);
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}

export const getTeamById = async (
    req: Request, 
    res: Response
) => {
    const teamId = parseInt(req.params.id);
    try {
        const team = await prisma.team.findUnique({
            where: {
                id: teamId,
            },
            select: selectedFields,
        });
        res.json(team);
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}

export const createTeam = async (
    req: Request, 
    res: Response
) => {
    bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
        const athleteId = parseInt(req.body.user_id);
        try {
            const team = await prisma.team.create({
                data: {
                    name: req.body.name,
                    password: hash,
                    members: {
                        connect: {
                            id: athleteId,
                        }
                    },
                    raceId: req.body.race_id,
                    admins: {
                        connect: {
                            id: athleteId,
                        },
                    },
                },
                select: selectedFields,
            });
            res.json(team);
        } catch (e) {
            res.status(500);
            res.json({
                'err': 'Internal error.'
            });
        }
    })
}

export const deleteTeam = async (
    req: Request, 
    res: Response
) => {
    const teamId = parseInt(req.params.id);
    try {
        const team = await prisma.team.delete({
            where: {
                id: teamId,
            }, 
            select: {
                name: true,
            }
        });
        res.json(team);
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}

export const joinTeam = async (
    req: Request, 
    res: Response
) => {
    const athleteId = parseInt(req.params.user_id);
    const teamId = parseInt(req.params.id);
    try{
        const teamPassword = await prisma.team.findUnique({
            where: {
                id: teamId,
            },
            select: {
                password: true,
            },
        });
        bcrypt.compare(req.body.team_password, String(teamPassword?.password), async (err, result) => {
            if (result === true) {
                const team = await prisma.team.update({
                    where: {
                        id: teamId,
                    }, 
                    data: {
                        members: {
                            connect: {
                                id: athleteId,
                            },
                        },
                    },
                    select: selectedFields,
                });
                res.json(team);
            }
        });
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}

export const leaveTeam = async (
    req: Request, 
    res: Response
) => {
    const athleteId = parseInt(req.params.user_id);
    const teamId = parseInt(req.params.id);
    try {
        const teamData = await prisma.team.findUnique({
            where : {
                id: teamId
            }, 
            select: {
                members: {
                    where: {
                        id:athleteId,
                    },
                    select: {
                        id: true,
                    }
                }, 
                admins: {
                    where: {
                        id: athleteId,
                    },
                    select: {
                        id: true,
                    }
                }
            }
        });
        
        const team = await prisma.team.update({
            where: {
                id: teamId,
            }, 
            data: {
                members: {
                    disconnect: {
                        id: athleteId,
                    }
                }
            }
        })
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}

export const addTeamAdmin = async (
    req: Request,
    res: Response
) => {
    const teamId = parseInt(req.params.id);
    const adminId = parseInt(req.params.user_id);
    const athleteId = parseInt(req.body.athlete_id);
    try {
        const isTeamAdmin: TeamAdmin | null = await prisma.teamAdmin.findFirst({
            where: {
                adminId: adminId,
                teamId: teamId,
            },
        });
        const isTeamMember: Athlete | null = await prisma.athlete.findFirst({
            where: {
                id: athleteId,
                teamId: teamId,
            },
        });
        const isAlreadyTeamAdmin: TeamAdmin | null = await prisma.teamAdmin.findFirst({
            where: {
                adminId: athleteId,
            }
        });
        if (isTeamAdmin !== null && isTeamMember !== null && isAlreadyTeamAdmin === null){
            await prisma.teamAdmin.create({
                data: {
                    adminId: adminId, 
                    teamId: teamId,
                },
            });
            const team = await prisma.team.findUnique({
                where:{
                    id: teamId,
                },
                select: selectedFields,
            });
            res.json(team);
        }else{
            if (isTeamAdmin === null) {
                res.status(403);
                res.json({
                    'err': 'Athlete is not an admin of the team.'        
                });
            }
            if (isTeamMember === null) {
                res.status(400);
                res.json({
                    'err': "Athelete selected is not a team member."
                })
            }
            if (isAlreadyTeamAdmin !== null) {
                res.status(400);
                res.json({
                    'err': "Athlete selected is already a team admin."
                })
            }
        }
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
}

export const removeTeamAdmin = async (
    req: Request,
    res: Response
) => {
    const teamId = parseInt(req.params.id);
    const adminId = parseInt(req.params.user_id);
    const athleteId = parseInt(req.body.athlete_id);
    try {
        const isTeamAdmin: TeamAdmin | null = await prisma.teamAdmin.findFirst({
            where: {
                adminId: adminId,
                teamId: teamId
            },
        });
        const athleteIsTeamAdmin: TeamAdmin | null = await prisma.teamAdmin.findFirst({
            where: {
                adminId: adminId,
                teamId: teamId,
            },
        })
        if (isTeamAdmin !== null && athleteIsTeamAdmin !== null) {
            await prisma.teamAdmin.delete({
                where: {
                    adminId: athleteId,
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
            if (isTeamAdmin === null) {
                res.status(403);
                res.json({
                    'err': 'Athlete is not an admin of the team.'
                });
            }
            if (athleteIsTeamAdmin === null) {
                res.status(400);
                res.json({
                    'err': "Athelete selected is not a team admin."
                })
            }
           
        }
    } catch (e) {
        res.status(500);
        res.json({
            'err': 'Internal error.'
        });
    }
};

export const updateTeamPassword = async (
    req: Request,
    res: Response
) => {
    console.log(updateTeamPassword);
    const { password } = req.body;
    const teamId = parseInt(req.params.id);

    try {
        const team = await prisma.team.findUnique({
            where: {
                id: teamId,
            },
        });
        const athlete = await prisma.athlete.findUnique({
            where: {
                userId: req.user.id,
            },
        });
        if (athlete) {
            const teamAdmin = await prisma.teamAdmin.findUnique({
                where: {
                    adminId: athlete.id,
                },
            });
            if (teamAdmin) {
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
                    err: "Athlete doesn't have enought rignts."
                })
            }
        } else {
            res.status(400);
            res.json({
                err: "Athlete must be a team member."
            })
        }
    } catch (err) {
        res.status(500);
        res.json({
            err: "Internal error.",
        });
    }
};
