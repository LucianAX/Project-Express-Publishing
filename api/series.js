const express = require('express');
const sqlite3 = require('sqlite3');
const issuesRouter = require('./issues.js');

// check if process.env.TEST_DATABASE has been set, and if so load that database instead.
// This allows the CCmy testing suite to check the routes without corrupting the app's database.
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

const seriesRouter = express.Router();
seriesRouter.use('/:seriesId/issues', issuesRouter);

seriesRouter.param('seriesId', (req, res, next, seriesId) => {
    db.get(`
        SELECT *
        FROM Series
        WHERE id = $id;
        `, { $id: seriesId },
        (err, foundSingleSeries) => {
            if (err) {
                return next(err);
            } else if (foundSingleSeries) {
                req.series = foundSingleSeries;
                next();
            } else {
                res.sendStatus(404);
            }
    });

});

seriesRouter.get('/', (req, res, next) => {
    db.all(`
        SELECT *
        FROM Series;
        `,
        (err, series) => {
            if (err) {
                next(err);
            } else {
                res.status(200).send({ series: series });
            }
        });
});

seriesRouter.get('/:seriesId', (req, res, next) => {
    res.status(200).send({ series: req.series });
});

seriesRouter.post('/', (req, res, next) => {
    const name = req.body.series.name;
    const description = req.body.series.description;

    if (name && description) {
        db.run(`
            INSERT INTO Series (name, description)
            VALUES ($name, $description);
            `, {
                $name: name,
                $description: description
            },
            function (err) {
                err ? next(err) : true;
                db.get(`
                    SELECT *
                    FROM Series
                    WHERE id = ${this.lastID};
                    `, (err, newSeries) => {
                        err ? next(err) : true;
                        res.status(201).send({ series: newSeries });
                });
        });
    } else {
        res.sendStatus(400);
    }
});

seriesRouter.put('/:seriesId', (req, res, next) => {
    const id = req.params.seriesId;
    const name = req.body.series.name;
    const description = req.body.series.description;

    if (name && description) {
        db.serialize(() => {
            db.run(`
                UPDATE Series
                SET name = $name,
                    description = $description
                WHERE id = $id;
                `, {
                    $id: id,
                    $name: name,
                    $description: description
                },
                (err) => {
                    err ? next(err) : true;
            });
            db.get(`
                SELECT *
                FROM Series
                WHERE id = $id;
                `, { $id: id },
                (err, updatedSeries) => {
                    err ? next(err) : true;
                    res.status(200).send({ series: updatedSeries });
            });
        });
        
    } else {
        res.sendStatus(400);
    }
});

seriesRouter.delete(`/:seriesId`, (req, res, next) => {
    db.get(`
        SELECT *
        FROM Issue
        WHERE series_id = $seriesId;
        `, { $seriesId: req.params.seriesId },
        (err, issue) => {
            if (err) {
                return next(err);
            }
            if (issue) {
                res.sendStatus(400);
            } else {
                db.run(`
                    DELETE FROM Series
                    WHERE id = $id;
                    `, { $id: req.params.seriesId },
                    (err) => {
                        if (err) {
                            return next(err);
                        }
                        res.sendStatus(204);
                    });
            }
    });
});

module.exports = seriesRouter;