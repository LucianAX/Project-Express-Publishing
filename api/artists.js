const express = require('express');
const sqlite3 = require('sqlite3');

// check if process.env.TEST_DATABASE has been set, and if so load that database instead.
// This allows the CCmy testing suite to check the routes without corrupting the app's database.
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

const artistsRouter = express.Router();

artistsRouter.param('artistId', (req, res, next, artistId) => {
    db.get(`
        SELECT *
        FROM Artist
        WHERE id = $id;
        `, { $id: artistId },
        (err, artist) => {
            if (err) {
                return next(err);
            } else if (artist) {
                req.artist = artist;
                next();
            } else {
                res.sendStatus(404);
            }
    });
});

artistsRouter.get('/', (req, res, next) => {
    db.all(`
        SELECT *
        FROM Artist
        WHERE is_currently_employed = 1;
    `, (err, artists) => {
        if (err) {
            return next(err);
        } 
        res.status(200).send({ artists: artists });
    });
});

artistsRouter.get('/:artistId', (req, res, next) => {
    res.status(200).send({ artist: req.artist });
});

artistsRouter.post('/', (req, res, next) => {
    const name = req.body.artist.name;
    const dateOfBirth = req.body.artist.dateOfBirth;
    const biography = req.body.artist.biography;
    let isEmployed = req.body.artist.isCurrentlyEmployed;
    
    if (name && dateOfBirth && biography) {
        isEmployed = isEmployed === 0 ? 0 : 1;
        db.run(`
            INSERT INTO Artist (
                name,
                date_of_birth,
                biography,
                is_currently_employed
            )
            VALUES (
                $name,
                $dateOfBirth,
                $biography,
                $isEmployed
            )`, {
                $name: name,
                $dateOfBirth: dateOfBirth,
                $biography: biography,
                $isEmployed: isEmployed
            }, function(err) {
                if (err) {
                    return next(err);
                }
                db.get(`
                    SELECT *
                    FROM Artist
                    WHERE id = ${this.lastID};
                    `, (err, newArtist) => {
                        if (err) {
                            return next(err);
                        }
                        res.status(201).send({ artist: newArtist });
                });
        });
    } else {
        res.sendStatus(400);
    }
});

artistsRouter.put('/:artistId', (req, res, next) => {
    const name = req.body.artist.name;
    const dateOfBirth = req.body.artist.dateOfBirth;
    const biography = req.body.artist.biography;
    let isEmployed = req.body.artist.isCurrentlyEmployed;

    if (name && dateOfBirth && biography) {
        isEmployed = isEmployed === 0 ? 0 : 1;
        db.run(`
            UPDATE Artist
            SET name = $name,
                date_of_Birth = $dateOfBirth,
                biography = $biography,
                is_currently_employed = $isEmployed
            WHERE id = $id;
            `, {
                $id: req.params.artistId,
                $name: name,
                $dateOfBirth: dateOfBirth,
                $biography: biography,
                $isEmployed: isEmployed 
            }, (err) => {
                if (err) {
                    return next(err);
                }
                db.get(`
                    SELECT *
                    FROM Artist
                    WHERE id = $id;
                    `, {
                        $id: req.params.artistId
                    }, (err, updatedtArtist) => {
                        if (err) {
                            return next(err);
                        }
                        res.status(200).send({ artist: updatedtArtist });
                });
        });
    } else {
        res.sendStatus(400);
    }
});

artistsRouter.delete('/:artistId', (req, res, next) => {
    //different than normal delete, instead of deleting artist from database, he's just marked as unemployed
    db.run(`
        UPDATE Artist
        SET is_currently_employed = 0
        WHERE id = $id
        `, {
            $id: req.params.artistId
        }, (err) => {
            if (err) {
                next(err);
            }
            db.get(`
                SELECT *
                FROM Artist
                WHERE id = $id
                `, {
                    $id: req.params.artistId
                },
                (err, deletedArtist) => {
                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({ artist: deletedArtist });
            });
        });
});

module.exports = artistsRouter;