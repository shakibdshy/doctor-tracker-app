"use client";

import type { TeamUserCreateInput } from "@doctor-tracker-app/auth/team-user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  banTeamUser,
  createTeamUser,
  listTeamUsers,
  setTeamUserRole,
  unbanTeamUser,
  type TeamUser,
} from "./api";

/** Query-key factory: the team roster is a single cached entry. */
export const teamKeys = {
  all: ["team"] as const,
};

export function useTeamUsers() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: () => listTeamUsers(),
  });
}

export function useSetTeamRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: TeamUser["role"] }) =>
      setTeamUserRole(input),
    onSuccess: () => {
      toast.success("Role updated");
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (roleError) => toast.error(roleError instanceof Error ? roleError.message : undefined),
  });
}

export function useBanTeamUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => banTeamUser(userId),
    onSuccess: () => {
      toast.success("User banned — their sessions were revoked");
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (banError) => toast.error(banError instanceof Error ? banError.message : undefined),
  });
}

export function useUnbanTeamUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unbanTeamUser(userId),
    onSuccess: () => {
      toast.success("User reinstated — they can sign in again");
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (unbanError) => toast.error(unbanError instanceof Error ? unbanError.message : undefined),
  });
}

export function useCreateTeamUser(onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TeamUserCreateInput) => createTeamUser(values),
    onSuccess: () => {
      toast.success("User created — they can sign in with the provisioned credentials");
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
      onDone();
    },
    onError: (createError) =>
      toast.error(createError instanceof Error ? createError.message : undefined),
  });
}
