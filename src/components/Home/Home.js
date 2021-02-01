import React, {useEffect, useState} from 'react';
import { withRouter } from 'react-router-dom';
import {
    Grid,
    Typography,
    makeStyles,
} from "@material-ui/core";
import PageLimit from "../Layouts/PageLimit";
import ReportColumn from "./ReportColumn";
import {withAuth} from "../Manager/withAuth";
import {withManager} from "../Manager";
import {withAppCache} from "../Cache";
import * as CONDITIONS from '../../constants/authConditions';
import AddReportButton from "./AddReportButton";


const useStyles = makeStyles((theme) => ({
    btnIcon: {
        marginRight: theme.spacing(1),
    },
    btnText: {
        marginRight: theme.spacing(1),
        fontSize: "1rem",
        fontWeight: "700",
    },
    fab: {
        textTransform: "none",  // Prevents the FAB's text from being capitalized
    },
    mainGrid: {
        height: "100%"
    },
    subGridContainer: {
        height: "100%",
        flexGrow: "1",
    },
    paperGridItem: {
        padding: theme.spacing(1),
        height: "100%"
    },
    paperContainer: {
        padding: theme.spacing(2),
        height: "100%"
    },
    reportsContainer: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: "auto",
    },
    headerGrid: {
        padding: theme.spacing(1)
    },
}));

function processData(snapshot) {
    let newData = [[],[],[]]
    if (snapshot !== null) {            // Catch a non-existent cache
        if (snapshot.val() !== null)    // Catch no data in database
        for (const [key, val] of Object.entries(snapshot.val())) {
            newData[val.status].push({
                id: key,
                ...val
            })
        }
    }
    return newData
}

function HomeBase(props) {
    const classes = useStyles();
    
    const isAdmin = props.adminMode;
    
    let [data, setData] = useState({
        values: props.cache.reports() !== null ? processData(props.cache.reports()) : [[],[],[]],
        loaded: props.cache.reports() !== null,
    })
    
    useEffect(() => {
        // This effect subscribes to a listener on the Firebase Realtime Database
        // The reference gets all of the reports with the correct UID
        // The data is then interpreted from an object into the "data" state
        // This is then partially passed to the "ReportColumns" to render
        let mounted = true;
        
        let reference = props.manager.db.ref("reports")
        let callback = snapshot => {
            props.cache.cacheReports(snapshot)

            if (mounted) {
                setData({
                    values: processData(snapshot),
                    loaded: true,
                });
            }
        }
        
        if (isAdmin === true) {
            reference
                .orderByChild("user/uid")
                .on('value', callback);
        } else {
            reference
                .orderByChild("user/uid")
                .equalTo(props.manager.auth.currentUser.uid)
                .on('value', callback);
        }
        
        return () => {
            mounted = false;
            reference.off()
        }
    }, [])

    return (
        <PageLimit maxWidth="lg">
            <Grid container direction="column" spacing={3} className={classes.mainGrid}>
                <Grid container direction="row" justify="space-between" alignItems="center" className={classes.headerGrid}>
                    <Grid item>
                        <Typography variant="h4">Welcome {isAdmin ? "Admin" : "User"}</Typography>
                    </Grid>
                    <Grid item>
                        <AddReportButton/>
                    </Grid>
                </Grid>
                <Grid container direction="row" className={classes.reportsContainer}>
                    <Grid item md={6} xs={12} className={classes.paperGridItem}>
                        <ReportColumn
                            reports={[...new Set([...data.values[1], ...data.values[0]])]}
                            loaded={data.loaded}
                            noItems="You have no Pending Reports"
                        />
                    </Grid>
                    <Grid item md={6} xs={12} className={classes.paperGridItem}>
                        <ReportColumn
                            reports={data.values[2]}
                            loaded={data.loaded}
                            noItems="You have no Completed Reports"
                        />
                    </Grid>
                </Grid>
            </Grid>
        </PageLimit>
    )
}

function HomeSwitcher(props) {
    console.log(props.isAdmin)
    if (props.isAdmin === true) {
        return (
            <HomeBase adminMode={true} {...props}/>
        )
    } else if (props.isAdmin === false) {
        return (
            <HomeBase adminMode={false} {...props}/>
        )
    } else {
        return (
            <div/>
        )
    }
}

export const Home = withAuth(CONDITIONS.withAnyUser)(withAppCache(withManager(withRouter(HomeSwitcher))));
