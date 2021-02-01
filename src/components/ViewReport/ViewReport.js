﻿import React, {useEffect} from "react";
import { withRouter, useParams } from 'react-router-dom';
import {
    makeStyles,
    Typography,
    Grid,
    colors as COLORS, Chip, Divider
} from "@material-ui/core";
import PageLimit from "../Layouts/PageLimit";
import {withAuth} from "../Manager/withAuth";
import {withManager} from "../Manager";
import * as CONDITIONS from "../../constants/authConditions";
import * as ROUTES from '../../constants/routes';
import ConfirmationDialogRaw from "./ConfirmationDialog";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import LoadingWheel from "../LoadingWheel/LoadingWheel";
import {withAppCache} from "../Cache";
import Comment from "./Comment";
import AddComment from "./AddComment";

const useStyles = makeStyles((theme) => ({
    formContainer: {
        height: "min-content",
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(4),
        paddingTop: theme.spacing(1),
        paddingBottom: theme.spacing(3),
    },
    dotContainer: {
        height: "100%",
    },
    chip: {
        height: "40px",
        borderRadius: '22px',
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
        '& .MuiChip-label': {
            color: 'white',
            fontWeight: 'bold',
            fontSize: "1rem",
        },
        '& .MuiChip-icon': {
            color: 'white',
        }
    },
    status2: {
        backgroundColor: COLORS.green["400"],
        '&:hover, &:focus': {
            backgroundColor: COLORS.green["400"],
        },
    },
    status1: {
        backgroundColor: COLORS.orange["400"],
        '&:hover, &:focus': {
            backgroundColor: COLORS.orange["400"],
        },
    },
    status0: {
        backgroundColor: COLORS.red["400"],
        '&:hover, &:focus': {
            backgroundColor: COLORS.red["400"],
        },
    },
    topDivider: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(2),
        height: "2px",
    },
    bottomDivider: {
        marginBottom: theme.spacing(2),
        height: "2px",
    }
}));

const UserTimeCommentsStyles = makeStyles({
    text: {
        display: "inline-block"
    }
});

function UserTimeComments(props) {
    const classes = UserTimeCommentsStyles();

    return (
        <Typography className={classes.text}>
            {props.username} reported this issue at {props.datetime.hour}:{props.datetime.minute}
        </Typography>
    )
}

const ViewReportBase = props => {
    const classes = useStyles();

    let { id } = useParams();
    const uid = props.manager.auth.currentUser.uid;
    const isAdmin = props.adminMode;
    
    const [data, setData] = React.useState({
        value: null,
        loaded: false,
    });
    const [open, setOpen] = React.useState(false);
    
    useEffect(() => {
        // This effect subscribes to a listener on the Firebase Realtime Database
        // The reference gets all of the data from the correct report in the db
        let mounted = true
        
        let reference = props.manager.db.ref("reports")
        reference
            .orderByKey()
            .equalTo(id)
            .on('value', function(snapshot) {
                let newData = null;
                
                if (snapshot.val() !== null) {
                    for (const [key, val] of Object.entries(snapshot.val())) {
                        newData = {
                            id: key,
                            ...val
                        };
                    } 
                }                    
                
                if (mounted) {
                    setData({
                        value: newData,
                        loaded: true,
                    });
                }
            });

        return () => {
            mounted = false;
            reference.off()
        }
    }, [])
    
    if (!data.loaded) {
        return (
            <LoadingWheel/>
        )
    } 
    if (data.value === null) {
        return (
            <div>No results found</div>
        )
    }
    if (data.value.user.uid !== uid && isAdmin === false) {
        return (
            <div>You dont have access to this report</div>
        )
    }
    if (data.value.user.uid === uid || isAdmin === true) {
        //// Set up chip ////
        let iconProps = { className: classes.icon }

        let [chipLabel, colorClass, chipIcon] = data.value.status === 2 ?
            ["Report Closed", classes.status2, <CheckCircleOutlineIcon {...iconProps}/>]:
            data.value.status === 1 ?
                ["Being Supported", classes.status1, <HelpOutlineIcon {...iconProps}/>]:
                ["Awaiting Support", classes.status0, <ErrorOutlineIcon {...iconProps}/>];


        //// Chip Callbacks ////
        const handleChipClick = () => {
            setOpen(true);
        };

        const handleClose = (newValue) => {
            setOpen(false);

            if (newValue !== undefined) {
                if (newValue === 3) {
                    props.manager.request.deleteForm(id)
                    props.history.push(ROUTES.HOME)
                } else {
                    let newData = data.value;
                    newData.status = newValue;

                    props.manager.request.updateForm(id, newData).then();

                    setData({
                        value: newData,
                        loaded: true,
                    });
                }
            }
        };
                
        return (
            <PageLimit maxWidth="md">
                <Grid container direction="row" justify="space-between">
                    <Typography variant="h3" component="h1">{data.value.title}</Typography>
                    {  /* Change chip based on whether user is admin TODO Change to conditional */
                        isAdmin === true ? (
                            <div>
                                <Chip
                                    label={chipLabel}
                                    icon={chipIcon}
                                    onClick={handleChipClick}
                                    className={`${classes.chip} ${colorClass}`}
                                />
                                <ConfirmationDialogRaw
                                    id="status-menu"
                                    keepMounted
                                    open={open}
                                    onClose={handleClose}
                                    value={data.value.status}
                                />
                            </div>
                        ) : (
                            <Chip
                                label={chipLabel}
                                icon={chipIcon}
                                className={`${classes.chip} ${colorClass}`}
                            />
                        )
                    }
                </Grid>
                <UserTimeComments
                    username={data.value.user.email}
                    datetime={data.value.datetime}
                    commentsLength={data.value.comments}
                />

                <Divider className={classes.topDivider}/>

                <Grid container direction="column">
                    {data.value.comments.map((value, index) => {
                        return (
                            <Grid item key={index}>
                                <Comment comment={value}/>
                            </Grid>
                        )
                    })}
                </Grid>
                <Divider className={classes.bottomDivider}/>
                <AddComment formId={id} func={props.manager.request.addComment}/>
            </PageLimit>
        )
    }
    else {
        return (
            <div>There has been an error</div>
        )
    }
}

const WrappedViewReportBase = withAppCache(withRouter(ViewReportBase));

function ViewReportSwitcher(props) {
    if (props.isAdmin === true) {
        return (
            <WrappedViewReportBase manager={props.manager} adminMode={true}/>
        )
    } else if (props.isAdmin === false) {
        return (
            <WrappedViewReportBase manager={props.manager} adminMode={false}/>
        )
    } else {
        return (
            <div/>
        )
    }
}

export const ViewReport = withAuth(CONDITIONS.withAnyUser)(withManager(ViewReportSwitcher));